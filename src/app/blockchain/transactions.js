// Frameworks
import { createDfuseClient } from '@dfuse/client';
import _ from 'lodash';

// App Components
import {
    Bloom,
} from './contracts';
import { Helpers } from '../utils/helpers';
import { GLOBALS } from '../utils/globals';

// Queries
import { streamTransactionQuery } from './queries/StreamTransactionQuery';
import { searchTransactionEvent } from './queries/SearchTransactionEvent';

// Transaction Events
const transactionEventMap = {
    'UPDATE_PARTICLE_TYPE': {   // find latest in logs for full record
        contract    : Bloom,
        eventName   : 'CreateCoupon',
        method      : 'CreateCoupon()',
    },
};

class Transactions {

    constructor() {
        this.apiKey = GLOBALS.DFUSE_API_KEY;
        this.updateCache = null;
        this.networkDispatch = null;
        this.txDispatch = null;
        this.networkId = 0;
        this.stream = null;
        this.client = null;
        this.cachedTxHash = null;
        this.activeSearchId = null;
    }

    static instance() {
        if (!Transactions.__instance) {
            Transactions.__instance = new Transactions();
        }
        return Transactions.__instance;
    }

    init({cachedTxHash, updateCache, networkDispatch, txDispatch}) {
        this.updateCache = updateCache;
        this.networkDispatch = networkDispatch;
        this.txDispatch = txDispatch;
        this.cachedTxHash = cachedTxHash;
    }

    connectToNetwork({networkId}) {
        const networkName = Helpers.getNetworkName(networkId);
        this.networkId = networkId;
        this.client = createDfuseClient({
            apiKey: this.apiKey,
            network: `${networkName}.eth.dfuse.io`,
            streamClientOptions: {
                socketOptions: {
                    onClose: this.onClose,
                    onError: this.onError,
                }
            }
        });
        this.networkDispatch({type: 'CONNECTED_NETWORK', payload: {
            networkId,
            isNetworkConnected: true,
            networkErrors: []
        }});
    }

    resumeIncompleteStreams() {
        if (_.isEmpty(this.cachedTxHash)) { return; }

        (async () => {
            await this.streamTransaction({transactionHash: this.cachedTxHash});
        })();
    }

    clearSearch() {
        if (!this.txDispatch) { return; }
        this.txDispatch({type: 'CLEAR_SEARCH'});
    }

    clearLoad() {
        if (!this.txDispatch) { return; }
        this.txDispatch({type: 'CLEAR_LOAD'});
    }

    cancelSearch() {
        this.activeSearchId = null;
    }

    onClose() {
        this.networkDispatch({type: 'DISCONNECTED_NETWORK', payload: {
            isNetworkConnected: false,
            networkErrors: []
        }});
    }

    onError(error) {
        this.networkDispatch({type: 'DISCONNECTED_NETWORK', payoad: {
            isNetworkConnected: false,
            networkErrors: ["Transactions: An error occurred with the socket.", JSON.stringify(error)]
        }});
    }

    generateSearchQuery({index, value, hash, type = 'topic', format = 'keccak'}) {
        if (!_.isEmpty(value) && _.isEmpty(hash)) {
            if (format === 'keccak') {
                hash = Helpers.keccakStr(value);
            }
            if (format === 'hex') {
                hash = `0x${Helpers.toHex(value)}`;
            }
        }
        return `${type}.${index}:${hash}`;
    }

    async streamTransaction({transactionHash}) {
        if (!this.txDispatch || !this.updateCache) { return; }
        this.updateCache('streamTxHash', transactionHash);
        this.txDispatch({type: 'BEGIN_STREAMING', payload: {transactionHash}});

        let currentTransitions = [];
        let confirmations = 0;
        let count = 0;
        let forceEnd = false;

        this.stream = await this.client.graphql(streamTransactionQuery, (message) => {

            if (message.type === 'error') {
                this.txDispatch({type: 'STREAM_ERROR', payload: {
                    streamError: message.errors[0]['message']
                }});
            }

            if (message.type === 'data') {
                const newTransition = {
                    key         : `transition-${count}`,
                    transition  : message['data']['transactionLifecycle']['transitionName'],
                    from        : message['data']['transactionLifecycle']['previousState'],
                    to          : message['data']['transactionLifecycle']['currentState'],
                    data        : message['data']
                };
                count++;
                currentTransitions = [...currentTransitions, newTransition];
                confirmations = _.get(newTransition, 'data.transactionLifecycle.transition.confirmations', 0);

                if (confirmations >= GLOBALS.MIN_BLOCK_CONFIRMATIONS) {
                    forceEnd = true;
                } else {
                    this.txDispatch({
                        type: 'STREAM_TRANSITION', payload: {
                            streamTransitions: currentTransitions.reverse()
                        }
                    });
                }
            }

            if (message.type === 'complete' || forceEnd) {
                this.cachedTxHash = null;
                this.updateCache('streamTxHash', '');
                this.txDispatch({type: 'STREAM_COMPLETE'});
                this.stream.close();
            }
        },{
            variables: {
                hash:  transactionHash
            }
        });

        await this.stream.join();
    }


    async getPublicParticles() {
        const partialQuery = `topic.3:${GLOBALS.BOOLEAN_FALSE_HEX}`;
        await this._searchCreatedTypes({queryType: 'SEARCH', partialQuery});
    }

    async searchPublicParticles({partialQuery}) {
        await this._searchCreatedTypes({queryType: 'SEARCH', partialQuery});
    }

    async loadPublicParticle({partialQuery}) {
        await this._searchCreatedTypes({queryType: 'LOAD', partialQuery});
    }

    async getCreatedParticlesByOwner({owner}) {
        const partialQuery = `signer:${_.toLower(owner)}`;
        await this._searchCreatedTypes({queryType: 'SEARCH', partialQuery, onVerifyNode: (node) => {
            return (_.toLower(node.from) === _.toLower(owner)); // Validate Owner
        }});
    }

    async _searchCreatedTypes({partialQuery, queryType, limit = '11', cursor = '', onVerifyNode}) {
        if (!this.txDispatch) { return; }
        this.txDispatch({type: `BEGIN_${queryType}`, payload: {}});

        const particleEventId = 'UPDATE_PARTICLE_TYPE';
        const plasmaEventId = 'UPDATE_PLASMA_TYPE';
        const contract = transactionEventMap[particleEventId].contract.instance();
        const contractAddress = _.toLower(contract.getAddress());
        if (_.isEmpty(contractAddress)) {
            throw new Error('Contract Address is not set! Are you on the wrong Network?');
        }

        const particleEventName = transactionEventMap[particleEventId].eventName;
        const particleMethodHash = Helpers.keccakStr(transactionEventMap[particleEventId].method);
        const plasmaEventName = transactionEventMap[plasmaEventId].eventName;
        const plasmaMethodHash = Helpers.keccakStr(transactionEventMap[plasmaEventId].method);

        const query = `address: ${contractAddress} ${partialQuery} (topic.0:${particleMethodHash} OR topic.0:${plasmaMethodHash})`;
        // console.log('query', query);
        const activeSearchId = Helpers.keccakStr(query);
        this.activeSearchId = activeSearchId;

        const response = await this.client.graphql(searchTransactionEvent, {
            variables: {
                query,
                limit,
                cursor,
                lowBlockNum: GLOBALS.STARTING_BLOCK,
            }
        });

        if (this.activeSearchId !== activeSearchId) {
            return; // Another search initiated after this one; ignore current
        }

        if (response.errors) {
            this.txDispatch({type: `${queryType}_ERROR`, payload: JSON.stringify(response.errors)});
            return;
        }

        const edges = response.data.searchTransactions.edges || [];
        if (edges.length <= 0) {
            this.txDispatch({type: `${queryType}_COMPLETE`, payload: []});
            return;
        }

        const searchTransactions = [];
        _.forEach(edges, ({node}) => {
            const receiver = node.from;

            // Verify Node
            if (_.isFunction(onVerifyNode) && !onVerifyNode(node)) { return; }

            // Parse matching topics
            _.forEach(node.matchingLogs, (logEntry) => {
                let decoded;
                if (logEntry.topics[0] === particleMethodHash) {
                    decoded = Helpers.decodeLog({eventName: particleEventName, logEntry});
                    searchTransactions.push({
                        ...decoded,
                        _owner: receiver
                    });
                }
                if (logEntry.topics[0] === plasmaMethodHash) {
                    decoded = Helpers.decodeLog({eventName: plasmaEventName, logEntry});
                    searchTransactions.push({
                        ...decoded,
                        _owner: receiver
                    });
                }
            });
        });
        this.txDispatch({type: `${queryType}_COMPLETE`, payload: searchTransactions});
    }


}
Transactions.__instance = null;

export default Transactions;

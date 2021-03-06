// Frameworks
import React from 'react';
import _ from 'lodash';

// App Components
import { ContractHelpers } from '../blockchain/contract-helpers';

// Contract Data
import {
    Bloom,
    DAI,
} from './contracts';

const _assetTokenMap = {
    chai: 'DAI',
};

const AssetTokenHelpers = {};

AssetTokenHelpers.getBalance = ({owner, assetPairId}) => {
    return new Promise((resolve, reject) => {
        const assetTokenName = _.get(_assetTokenMap, assetPairId, '');
        if (_.isEmpty(assetTokenName)) {
            return reject(`getBalance - Invalid Asset-Type-ID supplied: "${assetPairId}"`);
        }

        ContractHelpers.readContractValue(assetTokenName, 'balanceOf', owner)
            .then(resolve)
            .catch(err => {
                reject(`getBalance - ${err}`);
            });
    });
};

AssetTokenHelpers.getApprovalAmount = ({owner, assetPairId}) => {
    return new Promise((resolve, reject) => {
        const bloomAddress = Bloom.instance().getAddress();

        const assetTokenName = _.get(_assetTokenMap, assetPairId, '');
        if (_.isEmpty(assetTokenName)) {
            return reject(`getApprovalAmount - Invalid Asset-Type-ID supplied: "${assetPairId}"`);
        }

        ContractHelpers.readContractValue(assetTokenName, 'allowance', owner, bloomAddress)
            .then(resolve)
            .catch(err => {
                reject(`getApprovalAmount - ${err}`);
            });
    });
};

AssetTokenHelpers.setApprovalAmount = ({owner, assetPairId, amount}) => {
    return new Promise((resolve, reject) => {
        const bloomAddress = Bloom.instance().getAddress();

        const assetTokenName = _.get(_assetTokenMap, assetPairId, '');
        if (_.isEmpty(assetTokenName)) {
            return reject(`setApprovalAmount - Invalid Asset-Type-ID supplied: "${assetPairId}"`);
        }

        const tx = {from: owner};
        const args = [bloomAddress, amount];
        DAI.instance().sendContractTx('approve', tx, args, (err, transactionHash) => {
            if (err) {
                return reject(`setApprovalAmount - ${err}`);
            }
            resolve({tx, args, transactionHash});
        });
    });
};

export { AssetTokenHelpers };

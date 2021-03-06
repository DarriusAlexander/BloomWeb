const config = require('./config');

module.exports = {
    siteMetadata: {
        title:          config.siteTitle,
        description:    config.siteDesc,
        author:         config.siteAuthor,
        logoUrl:        config.siteLogoUrl,
    },

    pathPrefix: config.pathPrefix,

    plugins: [
        `gatsby-plugin-react-helmet`,
        {
            resolve: `gatsby-plugin-create-client-paths`,
            options: {prefixes: [`/app/*`]},
        },
        {
            resolve: `gatsby-source-filesystem`,
            options: {
                name: `images`,
                path: `${__dirname}/src/images`,
            },
        },
        `gatsby-transformer-sharp`,
        `gatsby-plugin-sharp`,
        {
            resolve: `gatsby-plugin-manifest`,
            options: {
                name:               config.manifestName,
                short_name:         config.manifestShortName,
                start_url:          config.pathPrefix || config.manifestStartUrl,
                background_color:   config.manifestBackgroundColor,
                theme_color:        config.manifestThemeColor,
                display:            config.manifestDisplay,
                icon:               config.manifestIcon, // This path is relative to the root of the site.
            },
        },
        `gatsby-plugin-lodash`,
        {
            resolve: `gatsby-plugin-prefetch-google-fonts`,
            options: {
                fonts: [
                    {
                        family: `Roboto`,
                        variants: [`300`, `400`, `500`]
                    },
                    {
                        family: `Montserrat`,
                        variants: [`400`, `700`]
                    },
                    {
                        family: `Open Sans`,
                        variants: [`400`, `700`]
                    },
                ],
            },
        },
        {
            resolve: `gatsby-plugin-material-ui`,
            options: {
                stylesProvider: {
                    injectFirst: true,
                },
            },
        },
        `gatsby-plugin-styled-components`,
        {
            resolve: 'gatsby-plugin-react-svg',
            options: {
                rule: {
                    include: /svg|vendor/
                }
            }
        },
        // 'gatsby-plugin-netlify',
        'gatsby-plugin-ipfs',

        // this (optional) plugin enables Progressive Web App + Offline functionality
        // To learn more, visit: https://gatsby.dev/offline
        // `gatsby-plugin-offline`,
    ],
};

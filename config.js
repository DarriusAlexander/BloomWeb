module.exports = {
    siteTitle: 'Bloom',
    siteDesc: 'Coupons that Earn Interest!',
    siteAuthor: 'Interesting Ventures',
    siteLogoUrl: 'src/images/gatsby-icon.png',

    manifestName: 'Bloom',
    manifestShortName: 'Bloom', // max 12 characters
    manifestStartUrl: 'https://jolly-sunset-4841.on.fleek.co',
    manifestBackgroundColor: '#663399',
    manifestThemeColor: '#663399',
    manifestDisplay: 'standalone',
    manifestIcon: 'src/images/gatsby-icon.png',

    // This path is subpath of your hosting https://your.domain/gatsby-eth-dapp-starter/
    // pathPrefix: `/gatsby-eth-dapp-starter/`,
    pathPrefix: '__GATSBY_IPFS_PATH_PREFIX__',

    // social
    socialLinks: [
        {
            icon: 'fa-github',
            name: 'Github',
            url: 'https://github.com/[__your_social_link__]',
        },
        {
            icon: 'fa-twitter',
            name: 'Twitter',
            url: 'https://twitter.com/[__your_social_link__]',
        },
        {
            icon: 'fa-facebook',
            name: 'Facebook',
            url: 'https://facebook.com/[__your_social_link__]',
        },
        {
            icon: 'fa-envelope-o',
            name: 'Email',
            url: 'mailto:[__your_email_address__]',
        },
    ],
};

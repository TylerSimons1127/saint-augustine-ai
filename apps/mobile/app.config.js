module.exports = ({ config }) => {
  const appEnv = process.env.APP_ENV || "development";
  const isDevelopment = appEnv === "development";

  // Apple requires review justification for global ATS exceptions. This app's
  // service endpoints use HTTPS; only development builds need LAN Metro access.
  // https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity/nsallowsarbitraryloads
  return {
    ...config,
    ios: {
      ...config.ios,
      infoPlist: {
        ...config.ios?.infoPlist,
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: false,
          ...(isDevelopment ? { NSAllowsLocalNetworking: true } : {}),
        },
      },
    },
  };
};

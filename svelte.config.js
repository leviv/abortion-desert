import adapter from "@sveltejs/adapter-static";

export default {
  kit: {
    adapter: adapter({
      // default options are shown. On some platforms
      // these options are set automatically — see below
      pages: "build",
      assets: "build",
      fallback: undefined,
      precompress: false,
      strict: true,
    }),
    paths: {
      // Make config.kit.paths.base to match the current repo name
      base: process.argv.includes("dev") ? "" : process.env.BASE_PATH,
    },
  },
};
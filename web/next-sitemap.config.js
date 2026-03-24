/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: "https://groupys.app",
  generateRobotsTxt: true,
  // Exclude authenticated/app pages from the sitemap
  exclude: ["/feed", "/profile", "/profile/*", "/discover", "/discover/*", "/coming-soon"],
};

import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: [
          "/erp/",
          "/admin/",
          "/dashboard/",
          "/inventory/",
          "/orders/",
          "/customers/",
          "/settings/",
          "/reports/",
          "/login/",
          "/api/",
        ],
      },
    ],
    sitemap: ["https://khyatigems.com/sitemap.xml"],
  };
}

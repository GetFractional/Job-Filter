/**
 * Job Filter - Skill Taxonomy
 *
 * Curated taxonomy for Growth Marketing leadership roles (Director/VP/CMO).
 * Kept intentionally compact for performance and high-signal extraction.
 *
 * Structure:
 * - name: Human-readable skill name
 * - canonical: Normalized key for deduplication
 * - category: Skill category for grouping
 * - aliases: Alternative names/abbreviations for matching
 */

// ============================================================================
// SKILL TAXONOMY (50 items max)
// ============================================================================

const SKILL_TAXONOMY = [
  // STRATEGY & LEADERSHIP
  {
    name: "Growth Strategy",
    canonical: "growth_strategy",
    category: "Strategy",
    aliases: ["growth planning", "growth roadmap", "scaling strategy"]
  },
  {
    name: "Go-to-Market Strategy",
    canonical: "go_to_market_strategy",
    category: "Strategy",
    aliases: ["GTM", "gtm strategy", "market launch", "launch strategy"]
  },
  {
    name: "Product Marketing",
    canonical: "product_marketing",
    category: "Strategy",
    aliases: ["product marketing strategy", "pm positioning"]
  },
  {
    name: "Brand Strategy",
    canonical: "brand_strategy",
    category: "Strategy",
    aliases: ["brand development", "brand positioning"]
  },
  {
    name: "Messaging & Positioning",
    canonical: "messaging_positioning",
    category: "Strategy",
    aliases: ["positioning", "value proposition", "messaging"]
  },
  {
    name: "Pricing Strategy",
    canonical: "pricing_strategy",
    category: "Strategy",
    aliases: ["pricing optimization", "price strategy", "monetization strategy"]
  },
  {
    name: "Market Research",
    canonical: "market_research",
    category: "Strategy",
    aliases: ["market analysis", "consumer research", "market intelligence"]
  },
  {
    name: "Competitive Analysis",
    canonical: "competitive_analysis",
    category: "Strategy",
    aliases: ["competitive intelligence", "competitor analysis"]
  },
  {
    name: "ICP Definition",
    canonical: "icp_definition",
    category: "Strategy",
    aliases: ["icp", "ideal customer profile", "customer profile definition"]
  },
  {
    name: "Customer Journey Mapping",
    canonical: "customer_journey_mapping",
    category: "Strategy",
    aliases: ["journey mapping", "customer journey"]
  },

  // GROWTH & ACQUISITION
  {
    name: "Demand Generation",
    canonical: "demand_generation",
    category: "Growth",
    aliases: ["demand gen", "pipeline generation", "pipeline growth"]
  },
  {
    name: "Lead Generation",
    canonical: "lead_generation",
    category: "Growth",
    aliases: ["lead gen", "lead acquisition", "inbound leads"]
  },
  {
    name: "Customer Acquisition",
    canonical: "customer_acquisition",
    category: "Growth",
    aliases: ["user acquisition", "acquisition strategy"]
  },
  {
    name: "Customer Retention",
    canonical: "customer_retention",
    category: "Growth",
    aliases: ["retention", "churn reduction"]
  },
  {
    name: "Lifecycle Marketing",
    canonical: "lifecycle_marketing",
    category: "Growth",
    aliases: ["lifecycle", "customer lifecycle"]
  },
  {
    name: "Conversion Rate Optimization",
    canonical: "conversion_rate_optimization",
    category: "Growth",
    aliases: ["CRO", "conversion optimization"]
  },
  {
    name: "Funnel Optimization",
    canonical: "funnel_optimization",
    category: "Growth",
    aliases: ["funnel analysis", "conversion funnel", "funnel effectiveness", "marketing funnels"]
  },
  {
    name: "Experimentation",
    canonical: "experimentation",
    category: "Growth",
    aliases: ["test and learn", "incrementality testing"]
  },
  {
    name: "A/B Testing",
    canonical: "ab_testing",
    category: "Growth",
    aliases: ["split testing", "multivariate testing"]
  },
  {
    name: "Product-Led Growth",
    canonical: "product_led_growth",
    category: "Growth",
    aliases: ["PLG", "product led growth"]
  },
  {
    name: "Sales-Led Growth",
    canonical: "sales_led_growth",
    category: "Growth",
    aliases: ["SLG", "sales led growth"]
  },

  // CHANNELS
  {
    name: "Content Marketing",
    canonical: "content_marketing",
    category: "Channels",
    aliases: ["content strategy", "editorial strategy"]
  },
  {
    name: "Digital Marketing",
    canonical: "digital_marketing",
    category: "Channels",
    aliases: ["digital marketing strategy", "online marketing"]
  },
  {
    name: "SEO",
    canonical: "seo",
    category: "Channels",
    aliases: ["search engine optimization", "organic search"]
  },
  {
    name: "SEM",
    canonical: "sem",
    category: "Channels",
    aliases: ["search engine marketing", "paid search", "PPC"]
  },
  {
    name: "Paid Media Strategy",
    canonical: "paid_media_strategy",
    category: "Channels",
    aliases: ["performance media", "media strategy"]
  },
  {
    name: "Paid Social Advertising",
    canonical: "paid_social_advertising",
    category: "Channels",
    aliases: ["paid social", "social ads"]
  },
  {
    name: "Paid Search Advertising",
    canonical: "paid_search_advertising",
    category: "Channels",
    aliases: ["paid search", "search ads"]
  },
  {
    name: "Email Marketing",
    canonical: "email_marketing",
    category: "Channels",
    aliases: ["email campaigns", "email automation"]
  },
  {
    name: "Community Marketing",
    canonical: "community_marketing",
    category: "Channels",
    aliases: ["community building", "community-led growth"]
  },
  {
    name: "Partner Marketing",
    canonical: "partner_marketing",
    category: "Channels",
    aliases: ["partner-led growth", "alliances marketing"]
  },
  {
    name: "Influencer Marketing",
    canonical: "influencer_marketing",
    category: "Channels",
    aliases: ["creator marketing", "influencer programs"]
  },
  {
    name: "Performance Marketing",
    canonical: "performance_marketing",
    category: "Channels",
    aliases: ["growth marketing", "performance acquisition"]
  },

  // OPERATIONS
  {
    name: "Marketing Automation",
    canonical: "marketing_automation",
    category: "Operations",
    aliases: ["automation", "automation workflows"]
  },
  {
    name: "CRM Strategy",
    canonical: "crm_strategy",
    category: "Operations",
    aliases: ["crm", "crm planning"]
  },
  {
    name: "Marketing Operations",
    canonical: "marketing_operations",
    category: "Operations",
    aliases: ["MOps", "marketing ops", "growth operations", "growth ops"]
  },
  {
    name: "Revenue Operations",
    canonical: "revenue_operations",
    category: "Operations",
    aliases: ["RevOps", "revenue ops"]
  },
  {
    name: "Lead Scoring",
    canonical: "lead_scoring",
    category: "Operations",
    aliases: ["lead qualification", "MQL scoring"]
  },
  {
    name: "Campaign Management",
    canonical: "campaign_management",
    category: "Operations",
    aliases: ["campaign execution", "campaign planning"]
  },

  // ANALYTICS & MEASUREMENT
  {
    name: "Marketing Analytics",
    canonical: "marketing_analytics",
    category: "Analytics",
    aliases: ["marketing analysis", "campaign analytics"]
  },
  {
    name: "Attribution Modeling",
    canonical: "attribution_modeling",
    category: "Analytics",
    aliases: ["multi-touch attribution", "attribution analysis"]
  },
  {
    name: "Media Mix Modeling",
    canonical: "media_mix_modeling",
    category: "Analytics",
    aliases: ["MMM", "marketing mix modeling"]
  },
  {
    name: "Marketing Measurement",
    canonical: "marketing_measurement",
    category: "Analytics",
    aliases: ["measurement", "incrementality"]
  },
  {
    name: "Segmentation",
    canonical: "segmentation",
    category: "Analytics",
    aliases: ["customer segmentation", "audience segmentation"]
  },
  {
    name: "Cohort Analysis",
    canonical: "cohort_analysis",
    category: "Analytics",
    aliases: ["cohort", "cohort analytics"]
  },
  {
    name: "LTV Analysis",
    canonical: "ltv_analysis",
    category: "Analytics",
    aliases: ["lifetime value", "CLV"]
  },
  {
    name: "CAC Analysis",
    canonical: "cac_analysis",
    category: "Analytics",
    aliases: ["customer acquisition cost", "CAC"]
  },
  {
    name: "Data Analysis",
    canonical: "data_analysis",
    category: "Analytics",
    aliases: ["analytics", "data analytics"]
  },
  {
    name: "SQL",
    canonical: "sql",
    category: "Analytics",
    aliases: ["structured query language", "sql querying"]
  },
  {
    name: "Python",
    canonical: "python",
    category: "Analytics",
    aliases: ["python programming", "python scripting"]
  }
];

// ============================================================================
// SYNONYM GROUPS - Map informal terms to canonical skills
// ============================================================================

const SKILL_SYNONYM_GROUPS = new Map([
  ["conversion_rate_optimization", ["CRO", "conversion optimization"]],
  ["ab_testing", ["A/B test", "split test", "multivariate test"]],
  ["go_to_market_strategy", ["GTM", "go to market"]],
  ["product_led_growth", ["PLG", "product led growth"]],
  ["sales_led_growth", ["SLG", "sales led growth"]],
  ["marketing_operations", ["mops", "marketing ops"]],
  ["revenue_operations", ["revops", "revenue ops"]],
  ["icp_definition", ["icp", "ideal customer profile"]],
  ["lead_generation", ["lead gen"]],
  ["demand_generation", ["demand gen", "pipeline generation"]],
  ["paid_search_advertising", ["paid search", "ppc"]],
  ["paid_social_advertising", ["paid social"]],
  ["seo", ["search optimization", "organic search"]],
  ["sem", ["paid search", "search ads"]],
  ["ltv_analysis", ["ltv", "clv", "lifetime value"]],
  ["cac_analysis", ["cac", "customer acquisition cost"]],
  ["media_mix_modeling", ["mmm", "marketing mix modeling"]]
]);

// ============================================================================
// CANONICAL RULES - Direct mappings for common abbreviations
// ============================================================================

const CANONICAL_RULES = new Map([
  ["cro", "conversion rate optimization"],
  ["gtm", "go-to-market strategy"],
  ["ppc", "paid search advertising"],
  ["seo", "seo"],
  ["sem", "sem"],
  ["mops", "marketing operations"],
  ["revops", "revenue operations"],
  ["icp", "icp definition"],
  ["ltv", "ltv analysis"],
  ["clv", "ltv analysis"],
  ["cac", "cac analysis"],
  ["mmm", "media mix modeling"],
  ["sql", "sql"],
  ["abm", "partner marketing"],
  ["plg", "product-led growth"],
  ["slg", "sales-led growth"],
  ["a/b testing", "a/b testing"],
  ["split testing", "a/b testing"]
]);

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  window.SkillTaxonomy = {
    SKILL_TAXONOMY,
    SKILL_SYNONYM_GROUPS,
    CANONICAL_RULES
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SKILL_TAXONOMY,
    SKILL_SYNONYM_GROUPS,
    CANONICAL_RULES
  };
}

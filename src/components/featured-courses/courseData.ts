export type Course = {
  id: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  description: string;

  // Current selling price
  fee: number;

  // Optional reference/MRP price
  originalFee: number;

  access: "premium";

  icon: string;

  theme: {
    background: string;
    iconBackground: string;
    iconColor: string;
  };
};

export const courses: Course[] = [
  {
    id: "gds-mts",
    title: "GDS → MTS",
    shortTitle: "GDS to MTS",
    subtitle: "GDS TO MTS PROMOTION",
    description:
      "Structured preparation for GDS Aspirants targeting the MTS promotion examination.",

    fee: 299,
    originalFee: 599,

    access: "premium",

    icon: "📚",

    theme: {
      background: "from-blue-50 to-white",
      iconBackground: "bg-blue-100",
      iconColor: "text-blue-700",
    },
  },

  {
    id: "gds-postman",
    title: "GDS → Postman / Mail Guard",
    shortTitle: "GDS to Postman",
    subtitle: "PROMOTION EXAMINATION",
    description:
      "Focused preparation for GDS Aspirants preparing for Postman and Mail Guard promotion.",

    fee: 499,
    originalFee: 999,

    access: "premium",

    icon: "📮",

    theme: {
      background: "from-red-50 to-white",
      iconBackground: "bg-red-100",
      iconColor: "text-red-700",
    },
  },

  {
    id: "postal-assistant",
    title: "Postal Assistant / Sorting Assistant",
    shortTitle: "PA / SA",
    subtitle: "PA / SA PREPARATION",
    description:
      "Comprehensive preparation resources for Postal Assistant and Sorting Assistant examinations.",

    fee: 599,
    originalFee: 1199,

    access: "premium",

    icon: "🎓",

    theme: {
      background: "from-blue-50 to-white",
      iconBackground: "bg-blue-100",
      iconColor: "text-blue-700",
    },
  },

  {
    id: "inspector-posts",
    title: "Inspector Posts",
    shortTitle: "Inspector Posts",
    subtitle: "LDCE PREPARATION",
    description:
      "Dedicated preparation resources for Inspector Posts LDCE Aspirants.",

    fee: 799,
    originalFee: 1499,

    access: "premium",

    icon: "⭐",

    theme: {
      background: "from-amber-50 to-white",
      iconBackground: "bg-amber-100",
      iconColor: "text-amber-700",
    },
  },

  {
    id: "pss-group-b",
    title: "PSS Group B",
    shortTitle: "PSS Group B",
    subtitle: "PROMOTION EXAMINATION",
    description:
      "Specialized preparation resources for PSS Group B Aspirants.",

    fee: 999,
    originalFee: 1999,

    access: "premium",

    icon: "🏆",

    theme: {
      background: "from-purple-50 to-white",
      iconBackground: "bg-purple-100",
      iconColor: "text-purple-700",
    },
  },
];
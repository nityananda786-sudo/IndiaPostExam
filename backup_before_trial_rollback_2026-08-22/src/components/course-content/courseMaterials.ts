// ============================================================
// IndiaPostExam - Course Materials
// ============================================================

export type CourseMaterial = {
  id: string;
  title: string;
  description: string;
  type: "pdf" | "video" | "document";
  url: string;
  locked?: boolean;
};

export type CourseSubject = {
  id: string;
  title: string;
  description: string;
  icon: string;
  materials: CourseMaterial[];
};

export type CourseMaterials = {
  courseId: string;
  courseTitle: string;
  subjects: CourseSubject[];
};


// ============================================================
// GDS → MTS
// ============================================================

const gdsMtsMaterials: CourseMaterials = {
  courseId: "gds-mts",

  courseTitle: "GDS → MTS",

  subjects: [

    {
      id: "general-awareness",

      title: "General Awareness",

      description:
        "Important general awareness topics for the GDS to MTS examination.",

      icon: "🌐",

      materials: [
        {
          id: "ga-001",

          title: "General Awareness – Study Notes",

          description:
            "Complete study notes for General Awareness.",

          type: "pdf",

          url: "#",

          locked: false,
        },

        {
          id: "ga-002",

          title: "Important Current Affairs",

          description:
            "Important current affairs and general knowledge topics.",

          type: "pdf",

          url: "#",

          locked: false,
        },
      ],
    },


    {
      id: "english",

      title: "English",

      description:
        "English language preparation and important examination topics.",

      icon: "📖",

      materials: [
        {
          id: "eng-001",

          title: "English Language – Study Notes",

          description:
            "Important English topics for examination preparation.",

          type: "pdf",

          url: "#",

          locked: false,
        },

        {
          id: "eng-002",

          title: "Grammar & Practice",

          description:
            "Grammar rules and practice material.",

          type: "pdf",

          url: "#",

          locked: false,
        },
      ],
    },


    {
      id: "mathematics",

      title: "Mathematics",

      description:
        "Mathematics concepts, formulas and practice material.",

      icon: "🔢",

      materials: [
        {
          id: "math-001",

          title: "Mathematics – Study Notes",

          description:
            "Important mathematical concepts and formulas.",

          type: "pdf",

          url: "#",

          locked: false,
        },

        {
          id: "math-002",

          title: "Mathematics Practice Set",

          description:
            "Practice questions for examination preparation.",

          type: "pdf",

          url: "#",

          locked: false,
        },
      ],
    },


    {
      id: "reasoning",

      title: "Reasoning",

      description:
        "Logical reasoning concepts and examination practice.",

      icon: "🧠",

      materials: [
        {
          id: "reasoning-001",

          title: "Reasoning – Study Notes",

          description:
            "Important reasoning topics and concepts.",

          type: "pdf",

          url: "#",

          locked: false,
        },

        {
          id: "reasoning-002",

          title: "Reasoning Practice Set",

          description:
            "Practice questions for reasoning preparation.",

          type: "pdf",

          url: "#",

          locked: false,
        },
      ],
    },


    {
      id: "postal-knowledge",

      title: "Postal Knowledge",

      description:
        "Important Postal Department related study material.",

      icon: "📮",

      materials: [
        {
          id: "postal-001",

          title: "Postal Knowledge – Study Notes",

          description:
            "Important postal knowledge topics for examination.",

          type: "pdf",

          url: "#",

          locked: false,
        },

        {
          id: "postal-002",

          title: "Important Postal Rules",

          description:
            "Important rules and concepts for examination preparation.",

          type: "pdf",

          url: "#",

          locked: false,
        },
      ],
    },


    {
      id: "previous-papers",

      title: "Previous Examination Questions",

      description:
        "Previous examination questions for practice and preparation.",

      icon: "📋",

      materials: [
        {
          id: "previous-001",

          title: "Previous Question Paper – Set 1",

          description:
            "Previous examination question paper.",

          type: "pdf",

          url: "#",

          locked: false,
        },

        {
          id: "previous-002",

          title: "Previous Question Paper – Set 2",

          description:
            "Previous examination question paper.",

          type: "pdf",

          url: "#",

          locked: false,
        },
      ],
    },

  ],
};


// ============================================================
// All Course Materials
// ============================================================

export const courseMaterials: Record<
  string,
  CourseMaterials
> = {
  "gds-mts": gdsMtsMaterials,
};


// ============================================================
// Helper
// ============================================================

export function getCourseMaterials(
  courseId: string
): CourseMaterials | null {
  return courseMaterials[courseId] ?? null;
}
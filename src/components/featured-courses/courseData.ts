import courseGdsPostman from "../../assets/images/course-gds-postman.svg";
import coursePa from "../../assets/images/course-pa.svg";
import courseIp from "../../assets/images/course-ip.svg";
import coursePssb from "../../assets/images/course-pssb.svg";

export const featuredCourse = {
  title: "GDS to MTS / Postman",
  badge: "FEATURED COURSE",

  description:
    "Complete preparation for GDS officials appearing for MTS and Postman promotion examinations.",

  image: courseGdsPostman,

  price: "₹499",
  oldPrice: "₹999",

  features: [
    "Complete Syllabus",
    "Previous Year Questions",
    "Mock Tests",
    "Study Materials",
    "Detailed Solutions",
  ],
};

export const otherCourses = [
  {
    title: "Postal Assistant / Sorting Assistant",

    description:
      "Complete preparation for Postal Assistant and Sorting Assistant examinations.",

    image: coursePa,

    color: "blue",
  },

  {
    title: "Inspector Posts",

    description:
      "Preparation materials and mock tests for Inspector Posts LDCE.",

    image: courseIp,

    color: "red",
  },

  {
    title: "PSS Group 'B'",

    description:
      "Complete study materials for PSS Group 'B' examination.",

    image: coursePssb,

    color: "purple",
  },
];
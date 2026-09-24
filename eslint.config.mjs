import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * eslint-config-next 16 sudah menerbitkan flat config langsung, jadi tidak perlu
 * lagi dibungkus FlatCompat. Pembungkus lama membuat ESLint 9 gagal total dengan
 * "Converting circular structure to JSON" saat memvalidasi skema config, sehingga
 * lint tidak pernah bisa dijalankan sama sekali.
 */
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      ".next-dev/**",
      "node_modules/**",
      ".agents/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],

      /**
       * Diturunkan ke peringatan, bukan dimatikan. Aturan ini baru hadir di
       * eslint-plugin-react-hooks 7 dan menandai pola yang di sini memang perlu:
       * membaca localStorage dan memuat data awal tidak bisa dilakukan saat
       * render karena tidak tersedia di server. Menulis ulang sebelas tempat
       * pemanggilan demi aturan ini lebih berisiko daripada manfaatnya, tetapi
       * peringatannya sengaja dibiarkan terlihat.
       */
      "react-hooks/set-state-in-effect": "warn",

      /**
       * SubjectIcon memilih komponen dari peta statis, bukan mendefinisikannya
       * ulang tiap render, sehingga identitasnya tetap dan tidak memicu remount
       * yang dikhawatirkan aturan ini.
       */
      "react-hooks/static-components": "warn",

      /**
       * Layar signage menampilkan gambar dari URL eksternal yang berubah-ubah
       * dan tidak melewati pengoptimal next/image.
       */
      "@next/next/no-img-element": "off",
    },
  },
];

export default eslintConfig;

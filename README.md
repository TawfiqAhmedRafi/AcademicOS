<p align="center">
  <img src="public/logo.png" alt="AcademicOS Logo" width="200" />
</p>

# AcademicOS (AOS)

AcademicOS is a comprehensive academic management system built with Next.js. It features a robust architecture designed for managing academic workflows, including an integrated LLM-free similarity search engine (AOS Match) for ETE projects and theses.

## 🚀 Features

- **Next.js 15+ App Router**: Built with the latest Next.js features and React 19.
- **Secure Authentication**: Integrated with `next-auth` and JWT for secure user sessions.
- **Database**: MongoDB integration for scalable data storage.
- **Payment Gateway**: SSLCommerz integrated for seamless transactions.
- **AOS Match Engine**: Advanced LLM-free similarity search using classical NLP (TF-IDF, LSA, text highlighting, and topic clustering) to prevent project duplication.
- **Email Notifications**: Automated email delivery via `nodemailer`.
- **Modern UI**: Styled with Tailwind CSS v4, Lucide React icons, and Next Themes for dark mode support.
- **Export & Reports**: Generate and export reports in Excel format using `xlsx`.

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Database**: [MongoDB](https://www.mongodb.com/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Backend Services**: Express (integrated functionality)
- **Tooling**: ESLint, PostCSS

## 📦 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB instance (local or Atlas)
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/TawfiqAhmedRafi/AcademicOS.git
   cd AcademicOS
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` or `.env.local` file in the root directory and configure the necessary environment variables:
   ```env
   # Add your specific variables based on your setup
   MONGODB_URI=
   NEXTAUTH_SECRET=
   NEXTAUTH_URL=http://localhost:3000
   # SSLCommerz variables
   STORE_ID=
   STORE_PASSWORD=
   IS_LIVE=false
   # Nodemailer variables
   EMAIL_USER=
   EMAIL_PASS=
   ```

4. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## 🧩 AOS Match Engine

AOS includes the **AOS Match Engine**, a specialized, LLM-free similarity search module designed to cross-reference ETE projects (2200/3200) and theses (4100/4200). 
- Depends solely on classical NLP (TF-IDF, char n-grams, LSA).
- Enforces strict isolation between search pools.
- Identifies shared terms and highlights best-matching sentences.

Please refer to `ANTIGRAVITY_PLAN.md` and `MATCH_PLAN.md` (if available) for the detailed implementation plan and architecture of the match engine.

## 📚 Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## ☁️ Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 📄 License

This project is licensed under the MIT License.

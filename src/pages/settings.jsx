import ConfigEditor from "components/config-editor";
import Head from "next/head";
import Link from "next/link";
import { FiArrowLeft, FiHome } from "react-icons/fi";

export default function SettingsPage() {
  return (
    <>
      <Head>
        <title>Settings - Homepage</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <main className="dark:text-theme-300">
          <ConfigEditor />
      </main>
    </>
  );
}

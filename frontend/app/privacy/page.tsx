import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy · LikeMinds" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="October 8, 2026">
      <p>
        LikeMinds (&ldquo;we&rdquo;) helps people share what they&apos;re building and find collaborators. This policy
        explains what we collect when you use likeminds.live, why, and the choices you have.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><b>Account details:</b> your name, email address, password (stored only as a secure hash) and, if you add it, your WhatsApp number.</li>
        <li><b>If you sign in with Google:</b> your name, email address and profile photo from your Google account. We never receive your Google password.</li>
        <li><b>Profile:</b> headline, bio, photo and anything else you add.</li>
        <li><b>What you post:</b> ideas, project links, comments, messages, group discussions, join requests and their notes, upvotes and saves.</li>
        <li><b>Technical data:</b> the IP address you signed up from, an approximate location derived from it (city and country), and whether you&apos;re currently online.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To run your account and show your posts and profile to other members. Public posts are also visible to visitors and in link previews.</li>
        <li>To connect collaborators: notifying project owners about join requests and letting you know when you&apos;re accepted.</li>
        <li>To send emails you control: activity emails, the weekly digest and announcements. Each has an unsubscribe link and a switch in Settings.</li>
        <li>To keep LikeMinds safe, prevent abuse and moderate content.</li>
      </ul>
      <p>We don&apos;t sell your personal data and we don&apos;t use advertising trackers.</p>

      <h2>Who we share it with</h2>
      <p>Only the service providers that run LikeMinds for us, under their own privacy and security terms:</p>
      <ul>
        <li>Vercel (website hosting), Render (application servers) and Neon (database)</li>
        <li>Resend (sending email)</li>
        <li>Google (only if you choose &ldquo;Continue with Google&rdquo;)</li>
        <li>ipwho.is (looking up an approximate location from your sign-up IP address)</li>
      </ul>
      <p>
        When you open a project link inside LikeMinds, our server checks whether that site can be displayed, and the
        site itself then loads in your browser.
      </p>
      <p>We may disclose information if the law requires it.</p>

      <h2>Your choices</h2>
      <ul>
        <li>Edit your profile and posts at any time, and choose whether each post is visible to everyone or members only.</li>
        <li>Turn emails on or off in Settings, or use the link at the bottom of any email.</li>
        <li>Delete your account in Settings. This removes your account and the content tied to it.</li>
      </ul>

      <h2>Storage and security</h2>
      <p>
        Your login is kept in your browser&apos;s local storage so you stay signed in. We use encrypted connections
        (HTTPS) and hashed passwords. No system is perfectly secure, but we work to protect your data.
      </p>

      <h2>Children</h2>
      <p>LikeMinds isn&apos;t intended for children under 13.</p>

      <h2>Changes and contact</h2>
      <p>
        We&apos;ll update this page if our practices change. Questions or requests:{" "}
        <a href="mailto:hello@likeminds.live">hello@likeminds.live</a>.
      </p>
    </LegalPage>
  );
}

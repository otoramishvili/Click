import type { Metadata } from "next";
import { LuClock, LuMail, LuMapPin, LuPhone } from "react-icons/lu";
import { ContactForm } from "@/components/contact/contact-form";
import { Container } from "@/components/container";
import { phoneLink, site } from "@/lib/site";

export const metadata: Metadata = { title: "Contact" };

/* Phones, email and stores from lib/site.ts on the left, a message form on the right. */
export default function ContactPage() {
  return (
    <Container className="py-10 lg:py-14">
      <h1 className="font-wide text-3xl font-bold tracking-tight">Contact</h1>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-14">
        <div>
          <p className="max-w-md text-base-content/70">
            Call, write, or send a message with the form. For a question about
            an order, mention its number.
          </p>

          <ul className="mt-6 space-y-4">
            {site.phones.map((phone) => (
              <li key={phone}>
                <a
                  href={phoneLink(phone)}
                  className="flex items-center gap-3 font-medium hover:text-primary"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-field bg-base-200 text-primary">
                    <LuPhone className="size-5" aria-hidden />
                  </span>
                  <span className="whitespace-nowrap">{phone}</span>
                </a>
              </li>
            ))}
            <li>
              <a
                href={`mailto:${site.email}`}
                className="flex items-center gap-3 font-medium hover:text-primary"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-field bg-base-200 text-primary">
                  <LuMail className="size-5" aria-hidden />
                </span>
                <span className="break-words">{site.email}</span>
              </a>
            </li>
          </ul>

          <h2 className="mt-8 text-lg font-semibold">Our stores</h2>
          <ul className="mt-4 space-y-5">
            {site.locations.map((location) => (
              <li key={location.address} className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-field bg-base-200 text-primary">
                  <LuMapPin className="size-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="font-medium">{location.name}</p>
                  <p className="text-base-content/70">{location.address}</p>
                  {location.hours && (
                    <p className="flex items-center gap-1.5 text-sm text-base-content/70">
                      <LuClock className="size-4 shrink-0" aria-hidden />
                      {location.hours}
                    </p>
                  )}
                  {location.mapUrl && (
                    <a
                      href={location.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link link-primary text-sm"
                    >
                      Show on the map
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-box border border-base-300 p-5 sm:p-8">
          <h2 className="mb-5 text-lg font-semibold">Send a message</h2>
          <ContactForm />
        </div>
      </div>
    </Container>
  );
}

import type { Metadata } from 'next';
import ContactForm from './ContactForm';

export const metadata: Metadata = {
  title: { absolute: 'Contact | Ahmed Emad Photographs' },
  description: 'Get in touch for bookings, collaborations, and print inquiries.',
};

export default function ContactPage() {
  return <ContactForm />;
}

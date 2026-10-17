export const websiteEnquiryTemplate = {
  key: "email_website_enquiry_acknowledgement",
  title: "Website enquiry acknowledgement",
  subject: "We received your enquiry — {{company_name}}",
  htmlBody:
    "<p>Dear {{customer_name}},</p><p>Thank you for contacting {{company_name}}. Your enquiry has been received and saved for our team to review.</p><p><strong>Reference:</strong> {{enquiry_reference}}<br/><strong>Subject:</strong> {{enquiry_subject}}</p><p>We will respond after reviewing your message. This acknowledgement does not confirm a purchase or gemstone assessment.</p><p>Kind regards,<br/>KhyatiGems</p>",
  plainTextBody:
    "Dear {{customer_name}},\n\nThank you for contacting {{company_name}}. Your enquiry has been received and saved for our team to review.\n\nReference: {{enquiry_reference}}\nSubject: {{enquiry_subject}}\n\nWe will respond after reviewing your message. This acknowledgement does not confirm a purchase or gemstone assessment.\n\nKind regards,\nKhyatiGems",
};

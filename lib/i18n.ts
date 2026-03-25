type Dict = Record<string, string>;

const en: Dict = {
  gst_title: "GST → GSTR-1",
  gst_desc: "B2B / B2C Large / B2C Small / Credit Notes / HSN summary",
  print_statement: "Print Statement",
  outstanding_ageing: "Outstanding & Ageing",
};

const hi: Dict = {
  gst_title: "जीएसटी → जीएसटीआर-1",
  gst_desc: "बी2बी / बी2सी बड़ा / बी2सी छोटा / क्रेडिट नोट / एचएसएन सारांश",
  print_statement: "स्टेटमेंट प्रिंट करें",
  outstanding_ageing: "बकाया और आयु वर्ग",
};

let current = "en";

export function setLang(lang: "en" | "hi") {
  current = lang;
}

export function t(key: string) {
  const dict = current === "hi" ? hi : en;
  return dict[key] || key;
}


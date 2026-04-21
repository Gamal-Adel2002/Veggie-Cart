export interface EgyptLocation {
  en: string;
  ar: string;
  type: "governorate" | "district" | "city";
}

export const EGYPT_LOCATIONS: EgyptLocation[] = [
  // Governorates
  { en: "Cairo", ar: "القاهرة", type: "governorate" },
  { en: "Giza", ar: "الجيزة", type: "governorate" },
  { en: "Alexandria", ar: "الإسكندرية", type: "governorate" },
  { en: "Luxor", ar: "الأقصر", type: "governorate" },
  { en: "Aswan", ar: "أسوان", type: "governorate" },
  { en: "Ismailia", ar: "الإسماعيلية", type: "governorate" },
  { en: "Suez", ar: "السويس", type: "governorate" },
  { en: "Port Said", ar: "بور سعيد", type: "governorate" },
  { en: "Mansoura", ar: "المنصورة", type: "governorate" },
  { en: "Tanta", ar: "طنطا", type: "governorate" },
  { en: "Zagazig", ar: "الزقازيق", type: "governorate" },
  { en: "Minya", ar: "المنيا", type: "governorate" },
  { en: "Hurghada", ar: "الغردقة", type: "city" },
  { en: "Sharm El-Sheikh", ar: "شرم الشيخ", type: "city" },
  { en: "Sohag", ar: "سوهاج", type: "governorate" },
  { en: "Fayoum", ar: "الفيوم", type: "governorate" },
  { en: "Beni Suef", ar: "بني سويف", type: "governorate" },
  { en: "Qena", ar: "قنا", type: "governorate" },
  { en: "Damietta", ar: "دمياط", type: "governorate" },
  { en: "Kafr El-Sheikh", ar: "كفر الشيخ", type: "governorate" },
  { en: "Beheira", ar: "البحيرة", type: "governorate" },
  { en: "Menoufia", ar: "المنوفية", type: "governorate" },
  { en: "Dakahlia", ar: "الدقهلية", type: "governorate" },

  // Cairo districts
  { en: "Maadi", ar: "المعادي", type: "district" },
  { en: "Zamalek", ar: "الزمالك", type: "district" },
  { en: "Heliopolis", ar: "مصر الجديدة", type: "district" },
  { en: "Misr El Gedida", ar: "مصر الجديدة", type: "district" },
  { en: "Nasr City", ar: "مدينة نصر", type: "district" },
  { en: "Mohandessin", ar: "المهندسين", type: "district" },
  { en: "Dokki", ar: "الدقي", type: "district" },
  { en: "Garden City", ar: "جاردن سيتي", type: "district" },
  { en: "New Cairo", ar: "القاهرة الجديدة", type: "district" },
  { en: "Fifth Settlement", ar: "التجمع الخامس", type: "district" },
  { en: "Rehab", ar: "الرحاب", type: "district" },
  { en: "Sheraton", ar: "شيراتون", type: "district" },
  { en: "Ain Shams", ar: "عين شمس", type: "district" },
  { en: "Shubra", ar: "شبرا", type: "district" },
  { en: "Downtown Cairo", ar: "وسط البلد", type: "district" },
  { en: "Wust El Balad", ar: "وسط البلد", type: "district" },
  { en: "Abbasiya", ar: "العباسية", type: "district" },
  { en: "Manial", ar: "المنيل", type: "district" },
  { en: "Agouza", ar: "العجوزة", type: "district" },
  { en: "Imbaba", ar: "إمبابة", type: "district" },
  { en: "Old Cairo", ar: "مصر القديمة", type: "district" },
  { en: "Muqqatam", ar: "المقطم", type: "district" },
  { en: "Helwan", ar: "حلوان", type: "district" },
  { en: "Basatin", ar: "البساتين", type: "district" },
  { en: "Matareya", ar: "المطرية", type: "district" },
  { en: "Katameya", ar: "قطاميا", type: "district" },
  { en: "Shorouk", ar: "الشروق", type: "district" },
  { en: "El Shorouk", ar: "الشروق", type: "district" },
  { en: "Madinaty", ar: "مدينتي", type: "district" },
  { en: "Obour", ar: "العبور", type: "district" },
  { en: "6th October", ar: "السادس من أكتوبر", type: "district" },
  { en: "Badr City", ar: "مدينة بدر", type: "city" },
  { en: "Sayyida Zeinab", ar: "السيدة زينب", type: "district" },
  { en: "Khan El Khalili", ar: "خان الخليلي", type: "district" },
  { en: "Zahraa El Maadi", ar: "زهراء المعادي", type: "district" },
  { en: "Dar El Salam", ar: "دار السلام", type: "district" },
  { en: "New Heliopolis", ar: "مصر الجديدة", type: "district" },

  // Giza districts
  { en: "Haram", ar: "الهرم", type: "district" },
  { en: "Faisal", ar: "فيصل", type: "district" },
  { en: "Hadayek El Ahram", ar: "حدائق الأهرام", type: "district" },
  { en: "Giza City", ar: "مدينة الجيزة", type: "district" },
  { en: "Ard El Lewa", ar: "أرض اللواء", type: "district" },
  { en: "Boulak El Dakrour", ar: "بولاق الدكرور", type: "district" },
  { en: "Omraneya", ar: "العمرانية", type: "district" },
  { en: "Hadayek El Maadi", ar: "حدائق المعادي", type: "district" },
  { en: "Sheikh Zayed", ar: "الشيخ زايد", type: "district" },
  { en: "Smart Village", ar: "القرية الذكية", type: "district" },
  { en: "October", ar: "أكتوبر", type: "district" },
];

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[\s\-_]+/g, " ")
    .trim();
}

export interface LocationMatch {
  location: EgyptLocation;
  score: number;
}

export function matchEgyptLocation(query: string): LocationMatch | null {
  if (!query || query.trim().length < 2) return null;
  const q = normalize(query);

  let best: LocationMatch | null = null;

  for (const loc of EGYPT_LOCATIONS) {
    const enNorm = normalize(loc.en);
    const arNorm = normalize(loc.ar);

    let score = 0;

    if (enNorm === q || arNorm === q) {
      score = 100;
    } else if (enNorm.startsWith(q) || arNorm.startsWith(q)) {
      score = 80;
    } else if (q.startsWith(enNorm) || q.startsWith(arNorm)) {
      score = 70;
    } else if (enNorm.includes(q) || arNorm.includes(q)) {
      score = 50;
    } else if (q.includes(enNorm) || q.includes(arNorm)) {
      score = 40;
    }

    if (score > 0 && (!best || score > best.score)) {
      best = { location: loc, score };
    }
  }

  return best;
}

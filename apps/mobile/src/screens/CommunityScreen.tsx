import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppIcon } from "@/components/AppIcon";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenLayout } from "@/components/ScreenLayout";
import { useTranslation } from "@/i18n";
import type { RootStackParamList } from "@/navigation/types";
import { useAuthStore } from "@/stores/authStore";
import { surfaceCard, theme } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Community">;
type CommunitySection = "updates" | "activities" | "people";

const sectionMeta: Record<
  CommunitySection,
  { accent: string }
> = {
  updates: {
    accent: theme.colors.primary,
  },
  activities: {
    accent: theme.colors.tileProgress,
  },
  people: {
    accent: theme.colors.tileMyWorld,
  },
};

interface UpdateItem {
  id: string;
  title: string;
  org: string;
  date: string;
  location: string;
  description: string;
}

interface ActivityItem {
  id: string;
  title: string;
  day: string;
  venue: string;
  suitableFor: string;
  description: string;
}

interface ContactItem {
  id: string;
  name: string;
  roleLabel: string;
  category: "family" | "community" | "healthcare" | "emergency";
}

const COMMUNITY_CONTENT: Record<string, {
  updates: UpdateItem[];
  activities: ActivityItem[];
  contacts: ContactItem[];
}> = {
  en: {
    updates: [
      {
        id: "u1",
        title: "Free health check-up camp",
        org: "ABC Health Foundation",
        date: "Sat, 15 Sept · 10:00 AM - 2:00 PM",
        location: "Siliguri Community Centre",
        description:
          "Blood pressure, sugar, and general wellness checks available to all elderly residents. No appointment needed. Please bring your health card.",
      },
      {
        id: "u2",
        title: "Dementia awareness session",
        org: "Community Health Workers",
        date: "Mon, 18 Sept · 11:00 AM",
        location: "Riverside Community Hall",
        description:
          "An open session for families to learn about early signs of dementia and how to access local support. Refreshments provided.",
      },
      {
        id: "u3",
        title: "Government elderly welfare scheme update",
        org: "Local Panchayat Office",
        date: "No fixed date",
        location: "Panchayat Office, Ward 4",
        description:
          "New pension disbursement dates announced for this quarter. Visit the office with your ID for details or ask a community worker to assist.",
      },
      {
        id: "u4",
        title: "Health worker home visits this week",
        org: "District Health Department",
        date: "Wed - Fri, 9:00 AM onward",
        location: "Door-to-door, Ward 2 & 3",
        description:
          "Health workers will visit registered households for routine check-ins. No action needed unless you'd like to reschedule.",
      },
      {
        id: "u5",
        title: "Free eye check-up and spectacle distribution",
        org: "North Bengal Eye Care Trust",
        date: "Fri, 21 Sept · 9:00 AM – 1:00 PM",
        location: "Ward 3 Primary Health Centre",
        description:
          "Vision screening for elderly residents, with free spectacles provided on the spot where needed. Family members are welcome to accompany.",
      },
    ],
    activities: [
      {
        id: "a1",
        title: "Gentle music morning",
        day: "Tuesday · 11:00 AM",
        venue: "Riverside Centre",
        suitableFor: "Elderly residents",
        description:
          "Listen to familiar old songs, meet neighbours, and enjoy a calm morning together. Stay as long as you like.",
      },
      {
        id: "a2",
        title: "Storytelling circle",
        day: "Thursday · 4:00 PM",
        venue: "Community Hall, Ward 4",
        suitableFor: "Elderly residents",
        description:
          "A relaxed afternoon of shared stories and light snacks, led by local volunteers.",
      },
      {
        id: "a3",
        title: "Morning yoga session",
        day: "Every Saturday · 7:00 AM",
        venue: "Community Park",
        suitableFor: "All ages, gentle pace",
        description:
          "Simple seated and standing stretches suitable for most mobility levels.",
      },
      {
        id: "a5",
        title: "Memory games afternoon",
        day: "Wednesday · 3:00 PM",
        venue: "Community Hall, Ward 2",
        suitableFor: "Elderly residents",
        description:
          "Enjoy simple memory games, picture matching, familiar objects, and friendly group activities at a comfortable pace.",
      },
    ],
    contacts: [
      { id: "c1", name: "Maya Roy", roleLabel: "Daughter", category: "family" },
      {
        id: "c2",
        name: "Rahul Das",
        roleLabel: "Community Health Worker",
        category: "community",
      },
      { id: "c3", name: "Dr. Ananya Sen", roleLabel: "Community Doctor", category: "healthcare" },
      { id: "c4", name: "Riverside Clinic", roleLabel: "Local Clinic", category: "healthcare" },
      { id: "c5", name: "Emergency Helpline", roleLabel: "24x7 Emergency Service", category: "emergency" },
      { id: "c6", name: "Arjun Roy", roleLabel: "Son", category: "family" },
    ],
  },
  hi: {
    updates: [
      {
        id: "u1",
        title: "मुफ़्त स्वास्थ्य जांच शिविर",
        org: "एबीसी हेल्थ फाउंडेशन",
        date: "शनिवार, 15 सितंबर · सुबह 10:00 - 2:00 बजे",
        location: "सिलिगुड़ी कम्युनिटी सेंटर",
        description:
          "उम्रदराज लोगों के लिए रक्तचाप, शुगर और सामान्य स्वास्थ्य जांच उपलब्ध है। अपॉइंटमेंट की जरूरत नहीं है। कृपया अपनी स्वास्थ्य कार्ड साथ लाएँ।",
      },
      {
        id: "u2",
        title: "डिमेंशिया जागरूकता सत्र",
        org: "कम्युनिटी हेल्थ वर्कर",
        date: "सोमवार, 18 सितंबर · सुबह 11:00 बजे",
        location: "रिवरसाइड कम्युनिटी हॉल",
        description:
          "परिवारों के लिए खुला सत्र ताकि वे डिमेंशिया के शुरुआती लक्षण और स्थानीय मदद कैसे लें, यह जान सकें। नाश्ता भी मिलेगा।",
      },
      {
        id: "u3",
        title: "सरकारी वृद्ध कल्याण योजना अपडेट",
        org: "स्थानीय पंचायत कार्यालय",
        date: "निश्चित तिथि नहीं",
        location: "पंचायत कार्यालय, वार्ड 4",
        description:
          "इस तिमाही के लिए नए पेंशन भुगतान की तारीखें घोषित की गई हैं। विवरण के लिए आईडी लेकर कार्यालय जाएँ या किसी कम्युनिटी वर्कर से पूछें।",
      },
      {
        id: "u4",
        title: "इस सप्ताह स्वास्थ्य कार्यकर्ता घर-घर दौरा",
        org: "जिला स्वास्थ्य विभाग",
        date: "बुधवार - शुक्रवार, सुबह 9:00 बजे से",
        location: "घर-घर, वार्ड 2 & 3",
        description:
          "स्वास्थ्य कार्यकर्ता पंजीकृत घरों में नियमित जांच के लिए आएंगे। यदि आप पुनर्निर्धारित करना चाहते हैं तो ही कार्रवाई करें।",
      },
      {
        id: "u5",
        title: "मुफ़्त आँख जांच और चश्मा वितरण",
        org: "नॉर्थ बंगाल आई केयर ट्रस्ट",
        date: "शुक्रवार, 21 सितंबर · सुबह 9:00 - 1:00 बजे",
        location: "वार्ड 3 प्राथमिक स्वास्थ्य केंद्र",
        description:
          "बुजुर्गों के लिए आँख परीक्षण और जरूरत पड़ने पर मुफ्त चश्मे उपलब्ध। परिवार के सदस्य साथ आ सकते हैं।",
      },
    ],
    activities: [
      { id: "a1", title: "साफ़ संगीत सुबह", day: "मंगलवार · सुबह 11:00 बजे", venue: "रिवरसाइड सेंटर", suitableFor: "बुजुर्ग निवासी", description: "पहचान की गई पुरानी गीत सुनें, पड़ोसियों से मिलें और शांत सुबह का आनंद लें। जितना चाहें रुकें।" },
      { id: "a2", title: "कहानी सुनने का चक्र", day: "गुरुवार · शाम 4:00 बजे", venue: "कम्युनिटी हॉल, वार्ड 4", suitableFor: "बुजुर्ग निवासी", description: "लोकल वॉलंटियर्स द्वारा साझा कहानियों और हल्का नाश्ता के साथ शांति भरा सत्र।" },
      { id: "a3", title: "सुबह योग सत्र", day: "हर शनिवार · सुबह 7:00 बजे", venue: "कम्युनिटी पार्क", suitableFor: "सभी उम्र, नरम गति", description: "अधिकांश लोगों के लिए सरल बैठकर और खड़े होकर स्ट्रेच।" },
      { id: "a5", title: "मेमोरी गेम्स दोपहर", day: "बुधवार · दोपहर 3:00 बजे", venue: "कम्युनिटी हॉल, वार्ड 2", suitableFor: "बुजुर्ग निवासी", description: "साधारण मेमोरी खेल, तस्वीर मिलान, परिचित वस्तुएँ और दोस्ताना समूह गतिविधियाँ।" },
    ],
    contacts: [
      { id: "c1", name: "माया रॉय", roleLabel: "बेटी", category: "family" },
      { id: "c2", name: "राहुल दास", roleLabel: "कम्युनिटी हेल्थ वर्कर", category: "community" },
      { id: "c3", name: "डॉ. अनन्या सेन", roleLabel: "कम्युनिटी डॉक्टर", category: "healthcare" },
      { id: "c4", name: "रिवरसाइड क्लिनिक", roleLabel: "स्थानीय क्लिनिक", category: "healthcare" },
      { id: "c5", name: "इमरजेंसी हेल्पलाइन", roleLabel: "24x7 इमरजेंसी सेवा", category: "emergency" },
      { id: "c6", name: "अर्जुन रॉय", roleLabel: "बेटा", category: "family" },
    ],
  },
  bn: {
    updates: [
      {
        id: "u1",
        title: "ফ্রি স্বাস্থ্য পরীক্ষা শিবির",
        org: "এবিসি হেলথ ফাউন্ডেশন",
        date: "শনিবার, 15 সেপ্টেম্বর · সকাল 10:00 - 2:00 PM",
        location: "শিলিগুড়ি কমিউনিটি সেন্টার",
        description:
          "বয়স্কদের জন্য রক্তচাপ, শর্করা ও সাধারণ সুস্থতা পরীক্ষা পাওয়া যাবে। অ্যাপয়েন্টমেন্টের দরকার নেই। স্বাস্থ্য কার্ড নিয়ে আসুন।",
      },
      {
        id: "u2",
        title: "ডিমেনশিয়া সচেতনতা সেশন",
        org: "কমিউনিটি হেলথ ওয়ার্কার",
        date: "সোমবার, 18 সেপ্টেম্বর · সকাল 11:00 AM",
        location: "রিভারসাইড কমিউনিটি হল",
        description:
          "পরিবারদের জন্য খোলা সেশন, যেখানে ডিমেনশিয়ার প্রাথমিক লক্ষণ ও স্থানীয় সহায়তা কিভাবে পাবেন তা শিখবেন। নাস্তা দেওয়া হবে।",
      },
      {
        id: "u3",
        title: "সরকারি বয়স্ক কল্যাণ প্রকল্প আপডেট",
        org: "স্থানীয় পঞ্চায়েত অফিস",
        date: "নির্দিষ্ট তারিখ নেই",
        location: "পঞ্চায়েত অফিস, ওয়ার্ড 4",
        description:
          "এই কোয়ার্টারের নতুন পেনশন বিতরণ তারিখ ঘোষণা হয়েছে। বিস্তারিত জানার জন্য আইডি নিয়ে অফিসে যান বা কমিউনিটি ওয়ার্কারকে জিজ্ঞেস করুন।",
      },
      {
        id: "u4",
        title: "এই সপ্তাহে স্বাস্থ্যকর্মী বাড়ি বাড়ি ভিজিট",
        org: "জেলা স্বাস্থ্য বিভাগ",
        date: "বুধবার - শুক্রবার, সকাল 9:00 AM থেকে",
        location: "বাড়ি বাড়ি, ওয়ার্ড 2 & 3",
        description:
          "স্বাস্থ্যকর্মীরা নিবন্ধিত বাড়িতে নিয়মিত চেক-ইন করবেন। আপনি চাইলে অনুরোধ করে আবার সময় নির্ধারণ করতে পারেন।",
      },
      {
        id: "u5",
        title: "ফ্রি চক্ষু পরীক্ষা ও চশমা বিতরণ",
        org: "নর্থ বেঙ্গল আই কেয়ার ট্রাস্ট",
        date: "শুক্রবার, 21 সেপ্টেম্বর · সকাল 9:00 AM – 1:00 PM",
        location: "ওয়ার্ড 3 প্রাথমিক স্বাস্থ্য কেন্দ্র",
        description:
          "বয়স্কদের জন্য দৃষ্টি পরীক্ষা এবং প্রয়োজন হলে বিনামূল্যে চশমা দেওয়া হবে। পরিবারের সদস্যরা সঙ্গী হতে পারবে।",
      },
    ],
    activities: [
      { id: "a1", title: "সহজ সঙ্গীত সকাল", day: "মঙ্গলবার · সকাল 11:00 AM", venue: "রিভারসাইড সেন্টার", suitableFor: "বয়স্ক বাসিন্দারা", description: "চেনা পুরনো গান শুনুন, প্রতিবেশীদের সঙ্গে কথা বলুন এবং শান্ত সকাল উপভোগ করুন। যতক্ষণ ইচ্ছা থাকুন।" },
      { id: "a2", title: "গল্প বলার বৃত্ত", day: "বৃহস্পতিবার · বিকাল 4:00 PM", venue: "কমিউনিটি হল, ওয়ার্ড 4", suitableFor: "বয়স্ক বাসিন্দারা", description: "স্থানীয় স্বেচ্ছাসেবকদের নেতৃত্বে গল্প ও হালকা নাস্তার সঙ্গে নরম বিকেল।" },
      { id: "a3", title: "সকাল yoga সেশন", day: "প্রতি শনিবার · সকাল 7:00 AM", venue: "কমিউনিটি পার্ক", suitableFor: "সব বয়সী, নরম গতি", description: "বেশিরভাগ মানুষদের জন্য সহজ বসা ও দাঁড়ানো স্ট্রেচ।" },
      { id: "a5", title: "মেমরি গেমস বিকাল", day: "বুধবার · বিকাল 3:00 PM", venue: "কমিউনিটি হল, ওয়ার্ড 2", suitableFor: "বয়স্ক বাসিন্দারা", description: "সহজ মেমরি খেলা, ছবি মিলানো, পরিচিত বস্তু ও বন্ধুত্বপূর্ণ দলগত কার্যক্রম।" },
    ],
    contacts: [
      { id: "c1", name: "মায়া রায়", roleLabel: "মেয়ে", category: "family" },
      { id: "c2", name: "রাহুল দাস", roleLabel: "কমিউনিটি হেলথ ওয়ার্কার", category: "community" },
      { id: "c3", name: "ডা. অনন্যা সেন", roleLabel: "কমিউনিটি ডাক্তার", category: "healthcare" },
      { id: "c4", name: "রিভারসাইড ক্লিনিক", roleLabel: "স্থানীয় ক্লিনিক", category: "healthcare" },
      { id: "c5", name: "ইমার্জেন্সি হেল্পলাইন", roleLabel: "24x7 ইমার্জেন্সি সেবা", category: "emergency" },
      { id: "c6", name: "অর্জুন রায়", roleLabel: "ছেলে", category: "family" },
    ],
  },
  as: {
    updates: [
      {
        id: "u1",
        title: "বিনামূলীয়া স্বাস্থ্য পৰীক্ষা শিবিৰ",
        org: "এবিচি হেল্থ ফাউণ্ডেশ্যন",
        date: "শনিবাৰে, 15 সেপ্টে · সকাল 10:00 - 2:00 PM",
        location: "শিলিগুড়ি কমিউনিটি цэнт্ৰ",
        description:
          "বয়স্ক লোকসকলৰ বাবে ৰক্তচাপ, চুকৰ আৰু সাধাৰণ সুস্থতাৰ পৰীক্ষা উপলব্ধ। সাক্ষাৎকাৰৰ প্ৰয়োজন নাই। স্বাস্থ্য কার্ড লৈ আহক।",
      },
      {
        id: "u2",
        title: "ডিমেনশিয়া সচেতনতা সেমিনাৰ",
        org: "কমিউনিটি হেল্থ ৱর্কাৰ",
        date: "সোমবাৰে, 18 সেপ্টে · বেলা 11:00",
        location: "ৰিভাৰছেড কমিউনিটি হ’ল",
        description:
          "পরিবারবোৰৰ বাবে খোলা সেশ্বন, য’ত ডিমেনশিয়াৰ আৰম্ভণি লক্ষণ আৰু স্থানীয় সহায় কিদৰে পাব লাগে জানিব পাৰি। খাবাৰৰ ব্যৱস্থা থাকিব।",
      },
      {
        id: "u3",
        title: "সরকাৰী বয়স্ক কল্যাণ স্কীম আপডেট",
        org: "স্থানীয় পঞ্চায়েত অফিস",
        date: "নির্দিষ্ট তাৰিখ নাই",
        location: "পঞ্চায়েত অফিস, ৱাৰ্ড 4",
        description:
          "এই চতুৰ্থাংশৰ নতুন পেনশন বিতৰণ তাৰিখ ঘোষণা কৰা হৈছে। বৃত্তান্তৰ বাবে ID লৈ অফিসলৈ যাওক বা কমিউনিটি ৱর্কাৰৰ পৰা জিজ্ঞাসা কৰক।",
      },
      {
        id: "u4",
        title: "এই সপ্তাহত স্বাস্থ্যকৰ্মী ঘৰৰ-ঘৰত ভিজিট",
        org: "জিলা স্বাস্থ্য বিভাগ",
        date: "বুধবাৰে - শুক্রবাৰে, সকাল 9:00 এ পৰা",
        location: "ঘৰৰ-ঘৰত, ৱাৰ্ড 2 & 3",
        description:
          "স্বাস্থ্যকৰ্মীসকল নিবন্ধিত ঘৰলৈ নিয়মিত চেক-ইন কৰিব। আপুনি ইচ্ছা কৰিলে পুনঃনির্ধাৰণ কৰিব পাৰি।",
      },
      {
        id: "u5",
        title: "বিনামূলীয়া চকু পৰীক্ষা আৰু চশমা বণ্টন",
        org: "নর্থ বেঙ্গল আই কেয়াৰ ট্রাষ্ট",
        date: "শুক্রবার, 21 সেপ্টে · সকাল 9:00 - 1:00 PM",
        location: "ৱাৰ্ড 3 প্রাথমিক স্বাস্থ্য কেন্দ্র",
        description:
          "বয়স্ক লোকসকলৰ বাবে দৃষ্টি পৰীক্ষা আৰু প্ৰয়োজনত বিনামূলীয়া চশমা দিয়া হ’ব। পৰিয়ালৰ সদস্যসকলেও সৈতে আহিব পাৰে।",
      },
      {
        id: "u6",
        title: "মেমৰী কফি — চাহ আৰু কথা",
        org: "শিলিগুড়ি কমিউনিটি চাৰ্কেল",
        date: "প্ৰতি বুধবার · 4:00 PM – 5:30 PM",
        location: "কমিউনিটি হ’ল, ৱাৰ্ড 4",
        description:
          "বয়স্ক লোকসকলৰ বাবে চাহৰ সৈতে স্বচ্ছন্দ পৰিচালিত সমাবেশ। নিবন্ধনৰ প্ৰয়োজন নাই — সোজা আহক।",
      },
      {
        id: "u7",
        title: "শীতকালীন ঔষধ আৰু শস্য সহায়তা ড্ৰাইভ",
        org: "জিলা সামাজিক কল্যাণ অফিস",
        date: "25 সেপ্টেবৰে আৰম্ভ",
        location: "ৱাৰ্ড 1–4 লৈ বিতৰণ বিন্দু",
        description:
          "নিবন্ধিত বয়স্ক লোকসকলৰ বাবে শীতকালৰ প্ৰয়োজনীয় ঔষধ আৰু রেশন কিট উপলব্ধ। অযোগ্যতা পৰীক্ষাৰ বাবে কমিউনিটি হেল্থ ৱর্কাৰৰ সৈতে কথা বলক।",
      },
    ],
    activities: [
      { id: "a1", title: "সুন্দর সঙ্গীত সকাল", day: "মঙ্গলবাৰে · সকাল 11:00", venue: "ৰিভাৰছেড চেন্ত্ৰ", suitableFor: "বয়স্ক বাসিন্দা", description: "চেনা পুরনো গান শুনক, প্রতিবেশীসকলৰ লগত দেখা কৰক, শান্ত সকাল উপভোগ কৰক। ইচ্ছা হ’লে আহি থাকক।" },
      { id: "a2", title: "কথা কইবাৰ বৃত্ত", day: "বৃহস্পতিবাৰে · বিকেল 4:00", venue: "কমিউনিটি হ’ল, ৱাৰ্ড 4", suitableFor: "বয়স্ক বাসিন্দা", description: "স্থানীয় স্বেচ্ছাসেৱকৰ নেতৃত্বত গল্প আৰু হালধীয়া খাবাৰ সৈতে শান্ত বিকেল।" },
      { id: "a3", title: "সকাল যোগ সেশন", day: "প্ৰতি শুক্রবাৰে · সকাল 7:00", venue: "কমিউনিটি পার্ক", suitableFor: "সকলে, মৃদু গতি", description: "অধিকাংশ লোকৰ বাবে সহজ বসি আৰু থিয়াই আদায় কৰা স্ট্রেচ।" },
      { id: "a5", title: "মেমৰি গেম বিকেল", day: "বুধবাৰে · বিকেল 3:00", venue: "কমিউনিটি হ’ল, ৱাৰ্ড 2", suitableFor: "বয়স্ক বাসিন্দা", description: "সহজ মেমৰি খেলা, ছবি মিলোৱা, পরিচিত বস্তু আৰু বন্ধুপ্ৰিয় দলীয় কার্যকলাপ।" },
      { id: "a6", title: "ঐতিহ্যবাহী শিল্প বৃত্ত", day: "শুক্রবাৰে · বিকেল 2:30", venue: "সাংস্কৃতিক কেন্দ্ৰ", suitableFor: "বয়স্ক বাসিন্দা আৰু পৰিয়াল", description: "শান্ত বিকেলতে সহজ ঐতিহ্যবাহী শিল্প তৈয়ি স্মৃতি আৰু স্থানীয় সংস্কৃতি ভাগ কৰক।" },
      { id: "a7", title: "পৰিয়ালৰ চাহ আৰু কথা", day: "ইষ্টবাৰে · বিকেল 4:00", venue: "পাড়া কেয়াৰ চেন্ত্ৰ", suitableFor: "বয়স্ক বাসিন্দা আৰু পৰিয়ালৰ সদস্য", description: "চাহ, হালধীয়া খাবাৰ আৰু অর্থপূর্ণ কথোপকথাৰ সহ শান্ত সামাজিক মিলন।" },
    ],
    contacts: [
      { id: "c1", name: "মায়া ৰয়", roleLabel: "কঁটেলী", category: "family" },
      { id: "c2", name: "ৰাহুল দাস", roleLabel: "কমিউনিটি হেল্থ ৱর্কাৰ", category: "community" },
      { id: "c3", name: "ড° অনন্যা সেন", roleLabel: "কমিউনিটি ডাক্তাৰ", category: "healthcare" },
      { id: "c4", name: "ৰিভাৰছেড ক্লিনিক", roleLabel: "স্থানীয় ক্লিনিক", category: "healthcare" },
      { id: "c5", name: "ইমাৰ্জেন্সি হেল্পলাইন", roleLabel: "24x7 ইমাৰ্জেন্সি সেৱা", category: "emergency" },
      { id: "c6", name: "অর্জুন ৰয়", roleLabel: "পুত্র", category: "family" },
    ],
  },
};

export function CommunityScreen({ navigation }: Props) {
  const patientName = useAuthStore((state) => state.patientName);
  const { t, language } = useTranslation();
  const communityData = COMMUNITY_CONTENT[language] ?? COMMUNITY_CONTENT.en;

  const sections: Array<{ key: CommunitySection; label: string }> = [
    { key: "updates", label: t("community.sections.updates") },
    { key: "activities", label: t("community.sections.activities") },
    { key: "people", label: t("community.sections.people") },
  ];

  const [activeSection, setActiveSection] = useState<CommunitySection>("updates");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const meta = sectionMeta[activeSection];

  const toggleExpanded = (id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  const handleCall = (name: string) => {
    Alert.alert(
      t("community.demoCall"),
      `${name} calling will be available in the full version.`
    );
  };

  return (
    <ScreenLayout>
      {/* ── Top nav — unchanged ─────────────────────────────── */}
      <ScreenHeader
        title={t("community.title")}
        subtitle={
          patientName
            ? t("community.subtitleWithName", { name: patientName })
            : t("community.subtitle")
        }
        onHomePress={() => navigation.navigate("Home")}
      />

      {/* ── Toggle nav (section pills) — unchanged ─────────────── */}
      <ScrollView
        horizontal
        style={styles.pillScroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillRow}
        accessibilityLabel={t("community.communitySections")}
      >
        {sections.map((section) => {
          const selected = section.key === activeSection;

          return (
            <Pressable
              key={section.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={section.label}
              onPress={() => {
                setActiveSection(section.key);
                setExpandedId(null);
              }}
              style={({ pressed }) => [
                styles.pill,
                selected && styles.selectedPill,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[styles.pillText, selected && styles.selectedPillText]}
                allowFontScaling
                numberOfLines={1}
              >
                {section.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Reddit-style feed — this is the ONLY part that scrolls ── */}
      <View style={styles.feedShell}>
        <ScrollView
          style={styles.feedScroll}
          contentContainerStyle={styles.feedContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cardList}>
            {activeSection === "updates" &&
              communityData.updates.map((item) => {
                const expanded = expandedId === item.id;
                return (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [
                      styles.card,
                      { borderLeftColor: meta.accent },
                      pressed && styles.pressed,
                    ]}
                    onPress={() => toggleExpanded(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.title}. ${expanded ? t("community.collapseDetails") : t("community.expandDetails")}`}
                  >
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.cardIconMark, { backgroundColor: meta.accent }]}>
                        <AppIcon name="FileText" size={20} color={theme.colors.onPrimary} weight="fill" />
                      </View>
                      <View style={styles.cardHeaderText}>
                        <Text style={styles.cardFlair} allowFontScaling numberOfLines={1}>
                          {item.org}
                        </Text>
                        <Text style={styles.cardTitle} allowFontScaling numberOfLines={2}>
                          {item.title}
                        </Text>
                        <Text style={styles.cardMeta} allowFontScaling>
                          {item.date}
                        </Text>
                        <Text style={styles.cardMeta} allowFontScaling>
                          {item.location}
                        </Text>
                      </View>
                    </View>
                    {expanded && (
                      <Text style={styles.cardBody} allowFontScaling>
                        {item.description}
                      </Text>
                    )}
                    <Text style={styles.expandToggleText} allowFontScaling>
                      {expanded ? t("community.showLess") : t("community.viewDetails")}
                    </Text>
                  </Pressable>
                );
              })}

            {activeSection === "activities" &&
              communityData.activities.map((item) => {
                const expanded = expandedId === item.id;
                return (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [
                      styles.card,
                      { borderLeftColor: meta.accent },
                      pressed && styles.pressed,
                    ]}
                    onPress={() => toggleExpanded(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.title}. ${expanded ? t("community.collapseDetails") : t("community.expandDetails")}`}
                  >
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.cardIconMark, { backgroundColor: meta.accent }]}>
                        <AppIcon name="Images" size={20} color={theme.colors.onPrimary} weight="fill" />
                      </View>
                      <View style={styles.cardHeaderText}>
                        <Text style={styles.cardFlair} allowFontScaling numberOfLines={1}>
                          {item.suitableFor}
                        </Text>
                        <Text style={styles.cardTitle} allowFontScaling numberOfLines={2}>
                          {item.title}
                        </Text>
                        <Text style={styles.cardMeta} allowFontScaling>
                          {item.day}
                        </Text>
                        <Text style={styles.cardMeta} allowFontScaling>
                          {item.venue}
                        </Text>
                      </View>
                    </View>
                    {expanded && (
                      <Text style={styles.cardBody} allowFontScaling>
                        {item.description}
                      </Text>
                    )}
                    <Text style={styles.expandToggleText} allowFontScaling>
                      {expanded ? t("community.showLess") : t("community.viewDetails")}
                    </Text>
                  </Pressable>
                );
              })}

            {activeSection === "people" &&
              communityData.contacts.map((item) => (
                <View key={item.id} style={[styles.card, { borderLeftColor: meta.accent }]}>
                  <View style={styles.cardHeaderRow}>
                    <View style={[styles.contactAvatar, { backgroundColor: meta.accent }]}>
                      <Text style={styles.contactAvatarText} allowFontScaling>
                        {item.name
                          .split(" ")
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join("")}
                      </Text>
                    </View>
                    <View style={styles.cardHeaderText}>
                      <Text style={styles.cardFlair} allowFontScaling numberOfLines={1}>
                        {t(`community.categories.${item.category}`)}
                      </Text>
                      <Text style={styles.cardTitle} allowFontScaling numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.cardMeta} allowFontScaling>
                        {item.roleLabel}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    style={({ pressed }) => [styles.callButton, pressed && styles.pressed]}
                    onPress={() => handleCall(item.name)}
                    accessibilityRole="button"
                    accessibilityLabel={t("community.demoCallHint", { name: item.name })}
                  >
                    <Text style={styles.callButtonText} allowFontScaling>
                      {t("community.demoCall")}
                    </Text>
                  </Pressable>
                </View>
              ))}

          </View>
        </ScrollView>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  pillScroll: {
    height: theme.touch.minTarget,
    flexGrow: 0,
  },
  pillRow: {
    gap: theme.spacing.xs,
    paddingBottom: theme.spacing.sm,
  },
  pill: {
    minWidth: 156,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: theme.border.subtleWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  selectedPill: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pillText: {
    ...theme.typography.caption,
    color: theme.colors.primaryDark,
    textAlign: "center",
    includeFontPadding: false,
  },
  selectedPillText: {
    ...theme.typography.caption,
    color: theme.colors.onPrimary,
    fontFamily: "AtkinsonHyperlegible_700Bold",
    fontWeight: "700",
  },
  // ── Feed shell: bounds the feed to the remaining screen height so
  // ONLY this area scrolls — header and pills above stay put. ──
  feedShell: {
    flex: 1,
    minHeight: 0,
  },
  feedScroll: {
    flex: 1,
  },
  feedContent: {
    paddingBottom: theme.spacing.md,
  },
  cardList: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  // ── Reddit-style post card: left accent stripe (colour = active
  // section), icon "avatar", flair line, then title/meta. ──
  card: {
    ...surfaceCard(),
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
    borderLeftWidth: theme.spacing.xs / 2,
    minHeight: 84,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.xs,
  },
  cardIconMark: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeaderText: {
    flex: 1,
    gap: 2,
  },
  cardFlair: {
    ...theme.typography.caption,
    color: theme.colors.primaryDark,
    fontFamily: "AtkinsonHyperlegible_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.foreground,
  },
  cardMeta: {
    ...theme.typography.caption,
    color: theme.colors.muted,
  },
  cardBody: {
    ...theme.typography.body,
    color: theme.colors.muted,
    marginTop: theme.spacing.xs,
  },
  expandToggleText: {
    ...theme.typography.caption,
    color: theme.colors.primaryDark,
    fontFamily: "AtkinsonHyperlegible_700Bold",
    marginTop: theme.spacing.xs,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  contactAvatarText: {
    ...theme.typography.bodyBold,
    color: theme.colors.onPrimary,
  },
  callButton: {
    minHeight: theme.touch.minTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primaryDark,
    marginTop: theme.spacing.xs,
  },
  callButtonText: {
    ...theme.typography.bodyBold,
    color: theme.colors.onPrimary,
  },
  pressed: {
    opacity: 0.78,
  },
});
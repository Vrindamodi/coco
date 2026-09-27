import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppIcon } from "@/components/AppIcon";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenLayout } from "@/components/ScreenLayout";
import type { RootStackParamList } from "@/navigation/types";
import { useAuthStore } from "@/stores/authStore";
import { surfaceCard, theme } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Community">;
type CommunitySection = "updates" | "activities" | "people";

const sections: Array<{ key: CommunitySection; label: string }> = [
  { key: "updates", label: "Community Updates" },
  { key: "activities", label: "Local Activities" },
  { key: "people", label: "Community Helpers" },
];

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
  category: "Family" | "Community" | "Healthcare" | "Emergency";
}

const updatesData: UpdateItem[] = [
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
  {
    id: "u6",
    title: "Memory café — tea and conversation",
    org: "Siliguri Community Circle",
    date: "Every Wednesday · 4:00 PM – 5:30 PM",
    location: "Community Hall, Ward 4",
    description:
      "A relaxed, drop-in gathering for elderly residents to chat over tea. No registration needed — just walk in.",
  },
  {
    id: "u7",
    title: "Winter medicine and ration support drive",
    org: "District Social Welfare Office",
    date: "Starts 25 Sept",
    location: "Distribution points across Ward 1–4",
    description:
      "Essential winter medicines and ration kits available for registered elderly residents. Ask your community health worker to check your eligibility.",
  },
];

const activitiesData: ActivityItem[] = [
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

  {
    id: "a6",
    title: "Traditional crafts circle",
    day: "Friday · 2:30 PM",
    venue: "Cultural Centre",
    suitableFor: "Elderly residents & families",
    description:
      "Spend a peaceful afternoon creating simple traditional crafts while sharing memories, stories, and local traditions.",
  },

  {
    id: "a7",
    title: "Family tea & conversation",
    day: "Sunday · 4:00 PM",
    venue: "Neighbourhood Care Centre",
    suitableFor: "Elderly residents & family members",
    description:
      "A relaxed social gathering with tea, light snacks, familiar conversations, and activities that encourage meaningful family connection.",
  },
];

const contactsData: ContactItem[] = [
  {
    id: "c1",
    name: "Maya Roy",
    roleLabel: "Daughter",
    category: "Family",
  },
  {
    id: "c2",
    name: "Rahul Das",
    roleLabel: "Community Health Worker",
    category: "Community",
  },
  {
    id: "c3",
    name: "Dr. Ananya Sen",
    roleLabel: "Community Doctor",
    category: "Healthcare",
  },
  {
    id: "c4",
    name: "Riverside Clinic",
    roleLabel: "Local Clinic",
    category: "Healthcare",
  },
  {
    id: "c5",
    name: "Emergency Helpline",
    roleLabel: "24x7 Emergency Service",
    category: "Emergency",
  },

  {
    id: "c6",
    name: "Arjun Roy",
    roleLabel: "Son",
    category: "Family",
  },
  {
    id: "c7",
    name: "Priya Sharma",
    roleLabel: "Care Coordinator",
    category: "Community",
  },
  {
    id: "c8",
    name: "Sunrise Medical Centre",
    roleLabel: "Nearby Healthcare Centre",
    category: "Healthcare",
  },
];

export function CommunityScreen({ navigation }: Props) {
  const patientName = useAuthStore((state) => state.patientName);

  const [activeSection, setActiveSection] = useState<CommunitySection>("updates");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const meta = sectionMeta[activeSection];

  const toggleExpanded = (id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  const handleCall = (name: string) => {
    Alert.alert("Demo call", `${name} calling will be available in the full version.`);
  };

  return (
    <ScreenLayout>
      {/* ── Top nav — unchanged ─────────────────────────────── */}
      <ScreenHeader
        title="Community"
        subtitle={
          patientName
            ? `Trusted support close to home, ${patientName}`
            : "Trusted support close to home"
        }
        onHomePress={() => navigation.navigate("Home")}
      />

      {/* ── Toggle nav (section pills) — unchanged ─────────────── */}
      <ScrollView
        horizontal
        style={styles.pillScroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillRow}
        accessibilityLabel="Community sections"
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
              updatesData.map((item) => {
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
                    accessibilityLabel={`${item.title}. ${expanded ? "Collapse details" : "Expand details"}`}
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
                      {expanded ? "Show less ▲" : "View details ▼"}
                    </Text>
                  </Pressable>
                );
              })}

            {activeSection === "activities" &&
              activitiesData.map((item) => {
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
                    accessibilityLabel={`${item.title}. ${expanded ? "Collapse details" : "Expand details"}`}
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
                      {expanded ? "Show less ▲" : "View details ▼"}
                    </Text>
                  </Pressable>
                );
              })}

            {activeSection === "people" &&
              contactsData.map((item) => (
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
                        {item.category}
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
                    accessibilityLabel={`Demo call for ${item.name}`}
                  >
                    <Text style={styles.callButtonText} allowFontScaling>
                      Demo call
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
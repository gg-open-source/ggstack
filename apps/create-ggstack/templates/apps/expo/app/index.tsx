import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.brand}>
              ggstack<Text style={styles.mint}>.</Text>
            </Text>
            <Text style={styles.badge}>Expo</Text>
          </View>
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>● YOUR NEXT CHAPTER STARTS HERE</Text>
            <Text style={styles.title}>
              Good foundations.{"\n"}
              <Text style={styles.mint}>Great possibilities.</Text>
            </Text>
            <Text style={styles.description}>
              A little less setup. A lot more building.{"\n"}Your{" "}
              {"{{APP_NAME}}"} app is ready for whatever comes next.
            </Text>
            <View
              style={styles.stack}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <View style={[styles.layer, styles.bottomLayer]} />
              <View style={[styles.layer, styles.middleLayer]} />
              <View style={[styles.layer, styles.topLayer]}>
                <Text style={styles.monogram}>gg.</Text>
              </View>
            </View>
          </View>
          <Text style={styles.sectionLabel}>
            FROM STARTER TO SOMETHING SPECIAL
          </Text>
          <View style={styles.card}>
            <Text style={styles.eyebrow}>01 / MAKE IT YOURS</Text>
            <Text style={styles.cardTitle}>Your code. Your canvas.</Text>
            <Text style={styles.description}>
              Open app/index.tsx and make your first edit. This is where your
              idea takes shape.
            </Text>
            <Text style={styles.note}>● Ready when you are</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.eyebrow}>02 / GROW YOUR STACK</Text>
            <Text style={styles.cardTitle}>Room for what’s next.</Text>
            <Text style={styles.description}>
              More apps, your favorite tools, one workspace. Build a stack that
              grows with your ambition.
            </Text>
          </View>
          <Text style={styles.footer}>A good start changes everything.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#101b25" },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 28 },
  container: { width: "100%", maxWidth: 680, alignSelf: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#2b3b46",
  },
  brand: {
    color: "#edf3ed",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -1,
  },
  mint: { color: "#b9f6cf" },
  badge: {
    color: "#b9f6cf",
    borderColor: "#3f544f",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    fontSize: 11,
  },
  hero: { paddingTop: 42 },
  eyebrow: {
    color: "#b9f6cf",
    fontSize: 9,
    letterSpacing: 1.5,
    marginBottom: 22,
  },
  title: {
    color: "#edf3ed",
    fontSize: 38,
    fontWeight: "600",
    letterSpacing: -1.8,
    lineHeight: 44,
  },
  description: {
    color: "#9aadb6",
    fontSize: 14,
    lineHeight: 24,
    marginTop: 14,
  },
  stack: {
    height: 230,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  layer: {
    position: "absolute",
    width: 122,
    height: 122,
    borderRadius: 20,
    transform: [{ rotate: "-30deg" }, { skewX: "12deg" }, { skewY: "12deg" }],
    borderWidth: 1,
  },
  bottomLayer: { top: 81, backgroundColor: "#314139", borderColor: "#a7bda2" },
  middleLayer: { top: 55, backgroundColor: "#efa987", borderColor: "#ffcdad" },
  topLayer: {
    top: 29,
    backgroundColor: "#b9f6cf",
    borderColor: "#e5ffed",
    alignItems: "center",
    justifyContent: "center",
  },
  monogram: {
    fontSize: 46,
    fontWeight: "800",
    letterSpacing: -4,
    color: "#183b2e",
  },
  sectionLabel: {
    color: "#9aadb6",
    fontSize: 9,
    letterSpacing: 1,
    marginBottom: 18,
  },
  card: {
    padding: 24,
    backgroundColor: "#15232e",
    borderColor: "#2b3b46",
    borderWidth: 1,
    borderRadius: 9,
    marginBottom: 14,
  },
  cardTitle: {
    color: "#edf3ed",
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: -0.5,
  },
  note: { color: "#b9f6cf", fontSize: 11, marginTop: 24 },
  footer: {
    color: "#9aadb6",
    fontSize: 11,
    marginTop: 20,
    paddingTop: 22,
    borderTopColor: "#2b3b46",
    borderTopWidth: 1,
  },
});

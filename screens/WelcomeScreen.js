import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, FontAwesome5, MaterialIcons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const isWeb = width > 768;

export default function WelcomeScreen({ navigation }) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);

  const features = [
    {
      icon: <MaterialIcons name="analytics" size={28} color="#2563EB" />,
      title: "AI Predictions",
      text: "Get intelligent cardiovascular risk analysis instantly.",
      gradient: ["#EEF2FF", "#FFFFFF"],
    },
    {
      icon: <Ionicons name="shield-checkmark" size={28} color="#14B8A6" />,
      title: "Secure & Private",
      text: "Advanced encryption ensures patient data safety.",
      gradient: ["#ECFEFF", "#FFFFFF"],
    },
    {
      icon: <FontAwesome5 name="chart-line" size={26} color="#7C3AED" />,
      title: "Clinical Insights",
      text: "Data-driven recommendations for doctors and patients.",
      gradient: ["#F5F3FF", "#FFFFFF"],
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>

        {/* HEADER */}
        <LinearGradient
          colors={["#1E3A8A", "#2563EB"]}
          style={styles.header}
        >
          <Ionicons name="medkit" size={55} color="#fff" />
          <Text style={styles.appTitle}>MediChat AI</Text>
          <Text style={styles.tagline}>
            Smart. Secure. AI-powered healthcare insights.
          </Text>
        </LinearGradient>

        <View style={styles.body}>

          {/* ================= FEATURE SECTION ================= */}
          {isWeb ? (
            <View style={[styles.featureRow, { flexDirection: "row" }]}>
              {features.map((item, index) => (
                <View key={index} style={styles.webCard}>
                  {item.icon}
                  <Text style={styles.featureTitle}>{item.title}</Text>
                  <Text style={styles.featureText}>{item.text}</Text>
                </View>
              ))}
            </View>
          ) : (
            <>
              <Animated.ScrollView
                horizontal
                pagingEnabled
                snapToInterval={width * 0.8}
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20 }}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                  { useNativeDriver: true }
                )}
                onMomentumScrollEnd={(event) => {
                  const index = Math.round(
                    event.nativeEvent.contentOffset.x / (width * 0.8)
                  );
                  setActiveIndex(index);
                }}
                scrollEventThrottle={16}
              >
                {features.map((item, index) => {
                  const inputRange = [
                    (index - 1) * width * 0.8,
                    index * width * 0.8,
                    (index + 1) * width * 0.8,
                  ];

                  const scale = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.9, 1, 0.9],
                    extrapolate: "clamp",
                  });

                  return (
                    <Animated.View
                      key={index}
                      style={[
                        styles.mobileCard,
                        { transform: [{ scale }] },
                      ]}
                    >
                      <LinearGradient
                        colors={item.gradient}
                        style={styles.cardGradient}
                      >
                        {item.icon}
                        <Text style={styles.featureTitle}>{item.title}</Text>
                        <Text style={styles.featureText}>{item.text}</Text>
                      </LinearGradient>
                    </Animated.View>
                  );
                })}
              </Animated.ScrollView>

              {/* Indicator Dots */}
              <View style={styles.dotsContainer}>
                {features.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      activeIndex === index && styles.activeDot,
                    ]}
                  />
                ))}
              </View>
            </>
          )}

          {/* CTA */}
          <View style={styles.ctaSection}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.navigate("DoctorLogin")}
            >
              <Text style={styles.primaryText}>Continue as Doctor</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate("PatientLogin")}
            >
              <Text style={styles.secondaryText}>Continue as Patient</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFF" },

  header: {
    paddingVertical: 45, // reduced height
    alignItems: "center",
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },

  appTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#fff",
    marginTop: 12,
  },

  tagline: {
    fontSize: 14,
    color: "#E0E7FF",
    marginTop: 6,
    textAlign: "center",
    paddingHorizontal: 30,
  },

  body: {
    paddingTop: 30,
    paddingBottom: 50,
    alignItems: "center",
  },

  featureRow: {
    width: "100%",
    maxWidth: 1000,
    gap: 20,
    justifyContent: "center",
  },

  webCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 25,
    flex: 1,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },

  mobileCard: {
    width: width * 0.75,
    marginRight: 20,
  },

  cardGradient: {
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
  },

  featureTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 12,
    color: "#0F172A",
    textAlign: "center",
  },

  featureText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },

  dotsContainer: {
    flexDirection: "row",
    marginTop: 15,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#CBD5E1",
    marginHorizontal: 5,
  },

  activeDot: {
    backgroundColor: "#2563EB",
    width: 18,
  },

  ctaSection: {
    width: "85%",
    marginTop: 35,
  },

  primaryBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    marginBottom: 15,
  },

  primaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    backgroundColor: "#fff",
  },

  secondaryText: {
    color: "#2563EB",
    fontSize: 16,
    fontWeight: "600",
  },
});

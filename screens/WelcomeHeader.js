import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";

export default function WelcomeHeader() {
  const currentTime = new Date();
  const greeting =
    currentTime.getHours() < 12
      ? "Good morning"
      : currentTime.getHours() < 18
      ? "Good afternoon"
      : "Good evening";

  return (
    <LinearGradient
      colors={["#2563eb", "#1d4ed8", "#1e3a8a"]} // gradient shades of blue
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Left section */}
      <View style={styles.leftSection}>
        <View style={styles.iconBox}>
          <Ionicons name="medical" size={28} color="#fff" />
        </View>
        <View>
          <Text style={styles.greeting}>{greeting}, Dr. Chen!</Text>
          <Text style={styles.subText}>
            Welcome to your clinical dashboard
          </Text>
        </View>
      </View>

      {/* Right section */}
      <View style={styles.rightSection}>
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={18} color="#fff" />
          <Text style={styles.timeText}>{format(currentTime, "h:mm a")}</Text>
        </View>
        <Text style={styles.dateText}>
          {format(currentTime, "EEEE, MMMM do, yyyy")}
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 5, // Android shadow
    marginVertical: 10,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 48,
    height: 48,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    lineHeight: 28,
  },
  subText: {
    fontSize: 14,
    color: "#bfdbfe",
  },
  rightSection: {
    alignItems: "flex-end",
    minWidth: 120,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 6,
  },
  dateText: {
    fontSize: 12,
    color: "#dbeafe",
    marginTop: 2,
    textAlign: "right",
  },
});

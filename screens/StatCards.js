import React from "react";
import { View, Text, StyleSheet } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { TrendingUp } from "react-native-lucide"; // or use @expo/vector-icons

export default function StatsCard({ title, value, icon: Icon, color, trend }) {
  const colorGradients = {
    blue: ["#3B82F6", "#2563EB"],    // blue-500 to blue-600
    green: ["#10B981", "#059669"],   // green-500 to green-600
    red: ["#EF4444", "#DC2626"],     // red-500 to red-600
    purple: ["#8B5CF6", "#7C3AED"],  // purple-500 to purple-600
  };

  const colorBackground = {
    blue: "#DBEAFE",
    green: "#D1FAE5",
    red: "#FEE2E2",
    purple: "#EDE9FE",
  };

  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <View style={styles.header}>
          <LinearGradient
            colors={colorGradients[color]}
            style={styles.iconContainer}
          >
            <Icon width={24} height={24} color="white" />
          </LinearGradient>

          {trend && (
            <View style={styles.trendContainer}>
              <TrendingUp width={16} height={16} color="#16A34A" />
            </View>
          )}
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.value}>{value}</Text>
          <Text style={styles.title}>{title}</Text>
          {trend && <Text style={styles.trendText}>{trend}</Text>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.8)",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    marginVertical: 8,
  },
  content: {
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  trendContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  textContainer: {
    flexDirection: "column",
  },
  value: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  title: {
    fontSize: 16,
    fontWeight: "500",
    color: "#4B5563",
  },
  trendText: {
    fontSize: 12,
    color: "#6B7280",
  },
});

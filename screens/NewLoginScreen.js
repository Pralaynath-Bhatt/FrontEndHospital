import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
// import LinearGradient from "react-native-linear-gradient";   
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

export default function Dashboard() {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const navigation = useNavigation();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // replace with API calls
      const encountersData = [];
      const patientsData = [];
      const analysesData = [];
      setAppointments(encountersData);
      setPatients(patientsData);
      setAnalyses(analysesData);
    } catch (e) {
      console.log(e);
    } finally {
      setIsLoading(false);
    }
  };

  const todayAppointments = appointments.filter((apt) => {
    const today = new Date().toDateString();
    return new Date(apt.scheduled_time).toDateString() === today;
  });

  const urgentAlerts = analyses.filter(
    (a) => a.risk_level === "high" || a.risk_level === "critical"
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={["#2563eb", "#1d4ed8"]}
        style={styles.headerCard}
      >
        <View>
          <Text style={styles.headerTitle}>Good evening, Dr. Chen!</Text>
          <Text style={styles.headerSub}>
            Welcome to your clinical dashboard
          </Text>
          <Text style={styles.headerDesc}>
            Here's a summary of your appointments, notifications, and patient
            records for today.
          </Text>
        </View>
        <Text style={styles.timeText}>
          {new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </LinearGradient>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <QuickButton
          title="New Encounter"
          icon="add-circle"
          bg="#2563eb"
          color="#fff"
          onPress={() => navigation.navigate("NewEncounter")}
        />
        <QuickButton
          title="Patient Records"
          icon="people"
          bg="#fff"
          border="#2563eb"
          color="#2563eb"
          onPress={() => navigation.navigate("PatientRecords")}
        />
        <QuickButton
          title="AI Insights"
          icon="trending-up"
          bg="#fff"
          border="#9333ea"
          color="#9333ea"
          onPress={() => navigation.navigate("AIInsights")}
        />
      </View>

      {/* Stats Overview */}
      <View style={styles.statsRow}>
        <StatsCard
          title="Today's Appointments"
          value={todayAppointments.length}
          icon="calendar"
          color="#2563eb"
          trend="+12% from yesterday"
        />
        <StatsCard
          title="Active Patients"
          value={patients.length}
          icon="people"
          color="#16a34a"
          trend="24 new this month"
        />
        <StatsCard
          title="Urgent Alerts"
          value={urgentAlerts.length}
          icon="alert-circle"
          color="#dc2626"
          trend="Requires attention"
        />
        <StatsCard
          title="AI Analyses"
          value={analyses.length}
          icon="analytics"
          color="#9333ea"
          trend="98% accuracy rate"
        />
      </View>

      {/* Today's Schedule */}
      <Card title="Today's Schedule" gradient={["#2563eb", "#1d4ed8"]}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#2563eb" />
        ) : todayAppointments.length > 0 ? (
          todayAppointments.map((apt) => (
            <AppointmentCard key={apt.id} appointment={apt} />
          ))
        ) : (
          <View style={styles.emptyBox}>
            <Icon name="calendar" size={50} color="#d1d5db" />
            <Text style={styles.emptyText}>No appointments today</Text>
          </View>
        )}
      </Card>

      {/* Urgent Alerts */}
      <Card title="Urgent Alerts" gradient={["#dc2626", "#b91c1c"]}>
        {urgentAlerts.length > 0 ? (
          urgentAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
        ) : (
          <View style={styles.emptyBox}>
            <Icon name="heart" size={50} color="#16a34a" />
            <Text style={styles.emptyText}>All patients stable</Text>
          </View>
        )}
      </Card>

      {/* Recent Analysis */}
      <Card title="Recent Analysis" gradient={["#9333ea", "#7e22ce"]}>
        {analyses.slice(0, 3).map((a) => (
          <View key={a.id} style={styles.analysisItem}>
            <Text style={styles.analysisText}>
              {a.analysis_type?.replace(/_/g, " ")}
            </Text>
            <Text style={styles.analysisSub}>
              Risk: {a.risk_level} ({a.risk_score || 0}%)
            </Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

/* ===== Reusable Components ===== */
const QuickButton = ({ title, icon, bg, border, color, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      styles.quickBtn,
      { backgroundColor: bg, borderColor: border || "transparent" },
    ]}
  >
    <Icon name={icon} size={18} color={color} />
    <Text style={[styles.quickText, { color }]}>{title}</Text>
  </TouchableOpacity>
);

const StatsCard = ({ title, value, icon, color, trend }) => (
  <View style={styles.statCard}>
    <Icon name={icon} size={22} color={color} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statTitle}>{title}</Text>
    <Text style={styles.statTrend}>{trend}</Text>
  </View>
);

const Card = ({ title, gradient, children }) => (
  <View style={styles.cardBox}>
    <LinearGradient colors={gradient} style={styles.cardHeader}>
      <Text style={styles.cardHeaderText}>{title}</Text>
    </LinearGradient>
    <View style={styles.cardContent}>{children}</View>
  </View>
);

const AppointmentCard = ({ appointment }) => (
  <View style={styles.item}>
    <Text style={styles.itemText}>Appointment #{appointment.id}</Text>
  </View>
);

const AlertCard = ({ alert }) => (
  <View style={styles.item}>
    <Text style={[styles.itemText, { color: "#dc2626" }]}>
      ⚠️ {alert.message || "Critical Alert"}
    </Text>
  </View>
);

/* ===== Styles ===== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },

  headerCard: {
    borderRadius: 16,
    padding: 20,
    margin: 16,
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  headerSub: { color: "#e0e7ff", marginTop: 4, fontSize: 14 },
  headerDesc: { color: "#c7d2fe", marginTop: 8, fontSize: 13 },
  timeText: { color: "#fff", marginTop: 10, fontSize: 12, textAlign: "right" },

  quickActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginHorizontal: 16,
    marginBottom: 20,
  },
  quickBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickText: { marginLeft: 6, fontSize: 14, fontWeight: "600" },

  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginHorizontal: 16,
  },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    width: "48%",
    marginBottom: 12,
    elevation: 3,
  },
  statTitle: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  statValue: { fontSize: 18, fontWeight: "bold", color: "#111827" },
  statTrend: { fontSize: 11, color: "#6b7280", marginTop: 2 },

  cardBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 20,
    elevation: 4,
  },
  cardHeader: {
    padding: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cardHeaderText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  cardContent: { padding: 12 },

  item: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
  },
  itemText: { fontSize: 14, color: "#111827" },

  emptyBox: { alignItems: "center", padding: 20 },
  emptyText: { color: "#6b7280", marginTop: 8 },

  analysisItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
  },
  analysisText: { fontWeight: "600", color: "#111827" },
  analysisSub: { fontSize: 12, color: "#6b7280" },
});

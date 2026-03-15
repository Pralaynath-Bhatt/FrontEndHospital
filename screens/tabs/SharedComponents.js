// components/SharedComponents.jsx — Reusable primitives across all tabs
import React, { memo } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";

import { C, G } from "../Constraint";

// ─── Error Parser ─────────────────────────────────────────────────────────────
export const parseApiError = (error) => {
  const errBody = error?.response?.data;
  if (!errBody) {
    return { type: "general", message: error?.message || "Something went wrong. Please try again." };
  }
  if (errBody?.data && typeof errBody.data === "object" && !Array.isArray(errBody.data)) {
    const fields = Object.entries(errBody.data).map(([key, msg]) => ({
      field: key.replace(/patientData\[\d+\]\./, "").replace(/([A-Z])/g, " $1").trim(),
      msg,
    }));
    return { type: "validation", message: errBody.message || "Validation Error", fields };
  }
  const msg =
    errBody?.message || errBody?.error || errBody?.detail ||
    (typeof errBody === "string" ? errBody : null) ||
    error?.message || "Something went wrong.";
  return { type: "general", message: msg };
};

// ─── ErrorCard ────────────────────────────────────────────────────────────────
export const ErrorCard = memo(({ error, onDismiss }) => {
  if (!error) return null;
  return (
    <View style={errS.wrap}>
      <View style={errS.header}>
        <MaterialCommunityIcons name="alert-circle" size={19} color={C.red} />
        <Text style={errS.headerText}>{error.message}</Text>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={errS.dismissBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="close" size={16} color={C.red} />
          </TouchableOpacity>
        )}
      </View>
      {error.type === "validation" && error.fields?.length > 0 && (
        <View style={errS.fieldList}>
          {error.fields.map((e, i) => (
            <View key={i} style={errS.fieldRow}>
              <View style={errS.fieldDot} />
              <Text style={errS.fieldName}>{e.field}: </Text>
              <Text style={errS.fieldMsg}>{e.msg}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

// ─── SectionCard ─────────────────────────────────────────────────────────────
export const SectionCard = memo(({ children, style }) => (
  <View style={[prim.sectionCard, style]}>{children}</View>
));

// ─── SectionHeading ───────────────────────────────────────────────────────────
export const SectionHeading = memo(({ icon, title, subtitle, color = C.blue }) => (
  <View style={prim.sectionHeading}>
    <LinearGradient colors={[color, color + "BB"]} style={prim.sectionHeadingIcon}>
      <MaterialCommunityIcons name={icon} size={20} color="#fff" />
    </LinearGradient>
    <View style={{ flex: 1 }}>
      <Text style={prim.sectionHeadingTitle}>{title}</Text>
      {subtitle ? <Text style={prim.sectionHeadingSubtitle}>{subtitle}</Text> : null}
    </View>
  </View>
));

// ─── FloatingInput ────────────────────────────────────────────────────────────
export const FloatingInput = memo(({ label, icon, value, onChangeText, placeholder, keyboardType, editable = true, multiline }) => (
  <View style={prim.floatWrap}>
    <Text style={prim.floatLabel}>{label}</Text>
    <View style={[prim.floatBox, !editable && prim.floatBoxDisabled]}>
      {icon && <MaterialCommunityIcons name={icon} size={18} color={C.textMuted} style={{ marginRight: 10 }} />}
      <TextInput
        style={[prim.floatInput, multiline && { height: 80, textAlignVertical: "top" }, { outlineStyle: "none" }]}
        value={value} onChangeText={onChangeText} placeholder={placeholder}
        placeholderTextColor={C.textMuted} keyboardType={keyboardType || "default"}
        editable={editable} multiline={multiline}
      />
    </View>
  </View>
));

// ─── FloatingPicker ───────────────────────────────────────────────────────────
export const FloatingPicker = memo(({ label, icon, selectedValue, onValueChange, enabled = true, children }) => (
  <View style={prim.floatWrap}>
    <Text style={prim.floatLabel}>{label}</Text>
    <View style={[prim.floatBox, !enabled && prim.floatBoxDisabled]}>
      {icon && <MaterialCommunityIcons name={icon} size={18} color={C.textMuted} style={{ marginRight: 10 }} />}
      <Picker selectedValue={selectedValue} onValueChange={onValueChange}
        style={prim.pickerInner} enabled={enabled} dropdownIconColor={C.textSecond}>
        {children}
      </Picker>
    </View>
  </View>
));

// ─── PrimaryButton ────────────────────────────────────────────────────────────
export const PrimaryButton = memo(({ label, icon, onPress, disabled, loading, gradient = G.blue }) => (
  <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.85}
    style={[prim.btnWrap, (disabled || loading) && { opacity: 0.5 }]}>
    <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={prim.btn}>
      {loading
        ? <ActivityIndicator color="#fff" size="small" style={{ marginRight: 10 }} />
        : icon && <MaterialCommunityIcons name={icon} size={20} color="#fff" style={{ marginRight: 10 }} />}
      <Text style={prim.btnText}>{loading ? "Processing..." : label}</Text>
    </LinearGradient>
  </TouchableOpacity>
));

// ─── Divider ──────────────────────────────────────────────────────────────────
export const Divider = () => <View style={prim.divider} />;

// ─── TwoCol ───────────────────────────────────────────────────────────────────
export const TwoCol = ({ children }) => <View style={prim.twoCol}>{children}</View>;

// ─── Styles ───────────────────────────────────────────────────────────────────
const prim = StyleSheet.create({
  sectionCard: {
    backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.border,
    padding: 20, shadowColor: "#1E3A8A", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09, shadowRadius: 12, elevation: 4,
  },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 4 },
  sectionHeadingIcon: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  sectionHeadingTitle: { fontSize: 17, fontWeight: "700", color: C.textPrimary, letterSpacing: 0.2 },
  sectionHeadingSubtitle: { fontSize: 12, color: C.textSecond, marginTop: 2 },
  floatWrap: { marginBottom: 14 },
  floatLabel: { fontSize: 10, fontWeight: "700", color: C.textSecond, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 },
  floatBox: {
    flexDirection: "row", alignItems: "center", backgroundColor: C.surfaceBlu,
    borderRadius: 12, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 14, minHeight: 50,
  },
  floatBoxDisabled: { opacity: 0.45 },
  floatInput: { flex: 1, fontSize: 15, color: C.textPrimary, paddingVertical: 12 },
  pickerInner: { flex: 1, color: C.textPrimary, height: 50, backgroundColor: "transparent" },
  btnWrap: {
    borderRadius: 14, overflow: "hidden", marginTop: 6,
    shadowColor: C.darkBlue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 10, elevation: 5,
  },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 15 },
  btnText: { fontSize: 16, fontWeight: "700", color: "#fff", letterSpacing: 0.3 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 16 },
  twoCol: { flexDirection: "row", gap: 12 },
});

const errS = StyleSheet.create({
  wrap: {
    marginTop: 14, borderRadius: 14, borderWidth: 1,
    borderColor: C.red + "40", backgroundColor: C.redLight, overflow: "hidden",
  },
  header: {
    flexDirection: "row", alignItems: "center", gap: 10, padding: 14,
    borderBottomWidth: 1, borderBottomColor: C.red + "20", backgroundColor: C.red + "12",
  },
  headerText: { fontSize: 14, fontWeight: "700", color: C.red, flex: 1 },
  dismissBtn: { padding: 4 },
  fieldList: { padding: 14, gap: 6 },
  fieldRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 4 },
  fieldDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.red, marginTop: 7 },
  fieldName: { fontSize: 13, fontWeight: "700", color: C.textPrimary },
  fieldMsg: { fontSize: 13, color: C.red, flex: 1 },
});
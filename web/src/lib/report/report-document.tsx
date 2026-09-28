import "server-only"

import { Document, Image, Page, StyleSheet, Text, View, type DocumentProps } from "@react-pdf/renderer"

import { classLabel, formatPercent, SCAN_CLASSES, type ScanClass } from "@/lib/analysis"

// Warna dari token DESIGN.md (mode terang). PDF memakai Helvetica bawaan agar tidak bergantung
// pada unduhan font saat laporan dibuat.
const color = {
  foreground: "#0F172A",
  muted: "#5B6475",
  border: "#E3E7EE",
  primary: "#0F5E6B",
  primarySoft: "#E4F2F3",
  normal: "#137333",
  benign: "#B45309",
  malignant: "#B91C1C",
  background: "#F5F7FA",
}
const classColor: Record<ScanClass, string> = {
  normal: color.normal,
  benign: color.benign,
  malignant: color.malignant,
}

const s = StyleSheet.create({
  page: { padding: 36, fontFamily: "Helvetica", fontSize: 10, color: color.foreground, lineHeight: 1.4 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 2,
    borderBottomColor: color.primary,
    paddingBottom: 8,
    marginBottom: 14,
  },
  brand: { fontSize: 18, fontFamily: "Helvetica-Bold", color: color.primary, lineHeight: 1.1, marginBottom: 2 },
  subtitle: { fontSize: 10, color: color.muted },
  section: { marginBottom: 12 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    color: color.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: { flexDirection: "row", gap: 12 },
  field: { flex: 1 },
  label: { fontSize: 8, color: color.muted, textTransform: "uppercase", letterSpacing: 0.3 },
  value: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  imageBox: { flex: 1, borderWidth: 1, borderColor: color.border, borderRadius: 4, padding: 4, alignItems: "center" },
  image: { width: "100%", height: 190, objectFit: "contain", backgroundColor: "#0A0D12" },
  caption: { fontSize: 8, color: color.muted, marginTop: 4 },
  card: { borderWidth: 1, borderColor: color.border, borderRadius: 4, padding: 10 },
  probRow: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  probLabel: { width: 70 },
  probTrack: { flex: 1, height: 6, backgroundColor: color.background, borderRadius: 3, marginHorizontal: 8 },
  probValue: { width: 50, textAlign: "right", fontFamily: "Courier" },
  badge: { alignSelf: "flex-start", paddingVertical: 3, paddingHorizontal: 8, borderRadius: 4, fontFamily: "Helvetica-Bold" },
  notes: { marginTop: 6, padding: 8, backgroundColor: color.background, borderRadius: 4 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    borderTopWidth: 1,
    borderTopColor: color.border,
    paddingTop: 6,
    fontSize: 8,
    color: color.muted,
  },
})

export type ReportImage = { data: Buffer; format: "png" | "jpg" } | null

export type ReportData = {
  appName: string
  appFullName: string
  disclaimer: string
  generatedAt: string
  patient: { code: string; fullName: string; age: number | null }
  uploadedAt: string
  images: { original: ReportImage; overlay: ReportImage }
  prediction: {
    predictedClass: ScanClass
    probabilities: Record<ScanClass, number>
    modelName: string
    modelVersion: string
    latency: string
    cached: boolean
  }
  review: {
    finalClass: ScanClass
    agreesWithAi: boolean
    notes: string | null
    doctorName: string
    reviewedAt: string
  }
}

function ClassBadge({ value }: { value: ScanClass }) {
  return (
    <Text style={[s.badge, { color: "#FFFFFF", backgroundColor: classColor[value] }]}>{classLabel[value]}</Text>
  )
}

function ReportImageBox({ image, caption }: { image: ReportImage; caption: string }) {
  return (
    <View style={s.imageBox}>
      {image ? (
        // eslint-disable-next-line jsx-a11y/alt-text -- Image react-pdf tidak memiliki atribut alt.
        <Image src={image} style={s.image} />
      ) : (
        <Text style={[s.caption, { height: 190 }]}>Citra tidak tersedia.</Text>
      )}
      <Text style={s.caption}>{caption}</Text>
    </View>
  )
}

export function ReportDocument(data: ReportData): React.ReactElement<DocumentProps> {
  const { patient, prediction, review } = data
  return (
    <Document title={`Laporan ${patient.code}`} author={data.appName} language="id">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>{data.appName}</Text>
            <Text style={s.subtitle}>Laporan kasus USG payudara</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontFamily: "Courier-Bold", fontSize: 12 }}>{patient.code}</Text>
            <Text style={s.subtitle}>Dibuat {data.generatedAt}</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Identitas pasien</Text>
          <View style={s.row}>
            <View style={s.field}>
              <Text style={s.label}>Kode pasien</Text>
              <Text style={[s.value, { fontFamily: "Courier-Bold" }]}>{patient.code}</Text>
            </View>
            <View style={[s.field, { flex: 2 }]}>
              <Text style={s.label}>Nama</Text>
              <Text style={s.value}>{patient.fullName}</Text>
            </View>
            <View style={s.field}>
              <Text style={s.label}>Usia</Text>
              <Text style={s.value}>{patient.age !== null ? `${patient.age} tahun` : "-"}</Text>
            </View>
            <View style={[s.field, { flex: 1.5 }]}>
              <Text style={s.label}>Citra diunggah</Text>
              <Text style={s.value}>{data.uploadedAt}</Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Citra USG</Text>
          <View style={s.row}>
            <ReportImageBox image={data.images.original} caption="Citra asli" />
            <ReportImageBox
              image={data.images.overlay}
              caption="Overlay heatmap Grad-CAM dari model (area yang berpengaruh pada prediksi, bukan batas lesi)"
            />
          </View>
        </View>

        <View style={[s.section, s.row]}>
          <View style={[s.card, { flex: 1 }]}>
            <Text style={s.sectionTitle}>Hasil AI</Text>
            <ClassBadge value={prediction.predictedClass} />
            {SCAN_CLASSES.map((c) => (
              <View key={c} style={s.probRow}>
                <Text style={[s.probLabel, c === prediction.predictedClass ? { fontFamily: "Helvetica-Bold" } : {}]}>
                  {classLabel[c]}
                </Text>
                <View style={s.probTrack}>
                  <View
                    style={{
                      width: `${Math.max(prediction.probabilities[c] * 100, 1)}%`,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: classColor[c],
                    }}
                  />
                </View>
                <Text style={s.probValue}>{formatPercent(prediction.probabilities[c])}</Text>
              </View>
            ))}
            <Text style={[s.caption, { marginTop: 8 }]}>
              Model {prediction.modelName} versi {prediction.modelVersion} · latensi {prediction.latency}
              {prediction.cached ? " · hasil tersimpan (mode demo)" : ""}
            </Text>
          </View>

          <View style={[s.card, { flex: 1 }]}>
            <Text style={s.sectionTitle}>Diagnosis dokter</Text>
            <ClassBadge value={review.finalClass} />
            <Text style={{ marginTop: 6, color: review.agreesWithAi ? color.normal : color.benign }}>
              {review.agreesWithAi
                ? "Sesuai dengan prediksi AI"
                : `Berbeda dengan prediksi AI (${classLabel[prediction.predictedClass]})`}
            </Text>
            <Text style={[s.label, { marginTop: 8 }]}>Catatan klinis</Text>
            <View style={s.notes}>
              <Text>{review.notes || "Tidak ada catatan."}</Text>
            </View>
            <Text style={[s.label, { marginTop: 8 }]}>Dokter pemeriksa</Text>
            <Text style={s.value}>{review.doctorName}</Text>
            <Text style={s.caption}>Didiagnosis {review.reviewedAt}</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>{data.disclaimer}</Text>
          <Text>
            {data.appName}: {data.appFullName}. Dokumen dibuat otomatis dari data aplikasi.
          </Text>
        </View>
      </Page>
    </Document>
  )
}

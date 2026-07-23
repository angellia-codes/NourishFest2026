import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { ProposalItem } from '@/types';

// Client-side PDF generation (no Drive/backend round-trip needed) — this is
// Nourish's own outgoing document, unlike the incoming Documents vault.
const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: 'Helvetica', color: '#1B1420' },
  title: { fontSize: 26, fontFamily: 'Helvetica-Bold', marginBottom: 4, color: '#FF3D77' },
  subtitle: { fontSize: 11, color: '#6B5F52', marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginTop: 16, marginBottom: 6 },
  paragraph: { fontSize: 10.5, lineHeight: 1.5, marginBottom: 4 },
  tierCard: {
    borderWidth: 1,
    borderColor: '#FFB238',
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
  },
  tierTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  tierPrice: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#FF3D77', marginBottom: 6 },
  benefit: { fontSize: 10, marginBottom: 2 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, fontSize: 8, color: '#9A8F80', textAlign: 'center' },
});

function formatIDR(value: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0);
}

export function ProposalPdfDocument({ overview, tiers }: { overview: ProposalItem[]; tiers: ProposalItem[] }) {
  return (
    <Document title="NourishFest 2026 — Sponsorship Proposal">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>NourishFest 2026</Text>
        <Text style={styles.subtitle}>Sponsorship Proposal</Text>

        {overview.map((o) => (
          <View key={o.Id}>
            <Text style={styles.sectionTitle}>{o.Title}</Text>
            {o.Description.split('\n').filter(Boolean).map((line, i) => (
              <Text key={i} style={styles.paragraph}>
                {line}
              </Text>
            ))}
          </View>
        ))}

        <Text style={styles.sectionTitle}>Sponsorship Packages</Text>
        {tiers.map((t) => (
          <View key={t.Id} style={styles.tierCard} wrap={false}>
            <Text style={styles.tierTitle}>{t.Title}</Text>
            <Text style={styles.tierPrice}>{formatIDR(t.Price)}</Text>
            {t.Description && <Text style={styles.paragraph}>{t.Description}</Text>}
            {t.Benefits.split('\n').filter(Boolean).map((b, i) => (
              <Text key={i} style={styles.benefit}>
                • {b}
              </Text>
            ))}
          </View>
        ))}

        <Text style={styles.footer} fixed>
          NourishFest 2026 · Generated from the Road to NourishFest planning app
        </Text>
      </Page>
    </Document>
  );
}

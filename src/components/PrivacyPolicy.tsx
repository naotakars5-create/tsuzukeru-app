import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, font, spacing } from '@/theme';

/**
 * プライバシーポリシー本文。
 *
 * App Store Connect に登録するURLはログインなしで開ける必要があるため、
 * 認証ゲートの外（app/_layout.tsx の Gate）からも、アプリ内（app/privacy.tsx）からも
 * 同じこの本文を表示する。
 */
export function PrivacyPolicy() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>プライバシーポリシー</Text>
      <Text style={styles.updated}>最終更新日: 2026年9月5日</Text>

      <Text style={styles.body}>
        本ポリシーは、学習習慣アプリ「覚悟の勉強」（以下「本アプリ」）における利用者の情報の
        取り扱いについて定めるものです。
      </Text>

      <Section title="1. 取得する情報">
        <Bullet>
          メールアドレス — アカウントの作成とログインのために取得します。
        </Bullet>
        <Bullet>
          学習に関する情報 — 設定した目標、学習時間、日ごとの達成状況、週ごとの判定結果、
          学習メモ、獲得した実績。
        </Bullet>
        <Bullet>
          プロフィール情報 — ニックネーム、プロフィール写真（登録された場合のみ）。
        </Bullet>
        <Bullet>
          支払いに関する情報 — カードのブランドと下4桁のみを保持します。
          カード番号・有効期限・セキュリティコードは Stripe 社が保管し、
          本アプリおよび当方のサーバーでは一切保存しません。
        </Bullet>
        <Bullet>
          通知用の識別子 — リマインド通知を送るための端末トークン（通知を有効にした場合のみ）。
        </Bullet>
      </Section>

      <Section title="2. 利用目的">
        <Bullet>本アプリの機能（目標管理、学習記録、リマインド通知）の提供のため。</Bullet>
        <Bullet>
          週ごとの目標達成の判定と、それに基づく料金の請求のため。
          達成した週は請求されず、達成できなかった週のみ、あらかじめ登録されたカードに
          その週ぶんの金額を請求します。
        </Bullet>
        <Bullet>
          コミュニティ機能において、参加者どうしで進捗を共有するため
          （ニックネーム、プロフィール写真、達成状況が他の参加者に表示されます）。
        </Bullet>
        <Bullet>不具合の調査と本アプリの改善のため。</Bullet>
      </Section>

      <Section title="3. 第三者への提供および委託">
        <Text style={styles.body}>
          法令に基づく場合を除き、取得した情報を第三者に販売または提供することはありません。
          本アプリの運営のため、以下のサービスに情報の取り扱いを委託しています。
        </Text>
        <Bullet>
          Supabase — アカウント情報および学習データの保管。
        </Bullet>
        <Bullet>
          Stripe — カード情報の保管と決済処理。
        </Bullet>
        <Bullet>
          Expo（Expo Application Services） — アプリの配信および通知の送信。
        </Bullet>
      </Section>

      <Section title="4. データの保存期間と削除">
        <Text style={styles.body}>
          取得した情報は、アカウントが存在する間、保存します。
          利用者はいつでも、本アプリの「設定」画面にある「アカウントを削除」から、
          アカウントとサーバー上のデータを完全に削除できます。削除は取り消せません。
        </Text>
        <Text style={styles.body}>
          なお、法令により保存が義務づけられている取引記録については、
          アカウント削除後も Stripe 社および当方において必要な期間保持することがあります。
        </Text>
      </Section>

      <Section title="5. 安全管理">
        <Text style={styles.body}>
          通信はすべて暗号化しています。データベースには行単位のアクセス制御を設定し、
          利用者は自身のデータのみを参照できます。カード番号は当方では保持しません。
        </Text>
      </Section>

      <Section title="6. お問い合わせ">
        <Text style={styles.body}>
          本ポリシーおよび個人情報の取り扱いに関するお問い合わせは、下記までご連絡ください。
        </Text>
        <Text style={styles.contact}>事業者名: （記入してください）</Text>
        <Text style={styles.contact}>連絡先: （記入してください）</Text>
      </Section>

      <Section title="7. 本ポリシーの変更">
        <Text style={styles.body}>
          本ポリシーの内容は、必要に応じて変更することがあります。
          重要な変更を行う場合は、本アプリ上でお知らせします。
        </Text>
      </Section>

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{title}</Text>
      {children}
    </View>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletMark}>・</Text>
      <Text style={[styles.body, { flex: 1, marginTop: 0 }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.xl },
  title: { fontSize: 24, fontWeight: '900', color: colors.text },
  updated: { marginTop: 4, fontSize: font.small, color: colors.textMuted },
  section: { marginTop: spacing.xl },
  heading: { fontSize: font.heading, fontWeight: '800', color: colors.text },
  body: { marginTop: spacing.sm, fontSize: font.sub, color: colors.textSub, lineHeight: 22 },
  bulletRow: { flexDirection: 'row', marginTop: spacing.sm },
  bulletMark: { fontSize: font.sub, color: colors.textSub, lineHeight: 22 },
  contact: { marginTop: spacing.sm, fontSize: font.sub, color: colors.text, fontWeight: '700' },
});

/**
 * 「Googleで続ける」ボタンに渡すもの（ネイティブ版とWeb版で実装が分かれている）。
 */
export interface GoogleSignInButtonProps {
  /**
   * link: いまの匿名アカウントにGoogleを紐付ける（記録とカードはそのまま残る）
   * signIn: 別のGoogleアカウントでログインし直す（機種変更のときの引き継ぎ）
   */
  mode: 'link' | 'signIn';
  /** Googleから戻ってくる先のパス（例: '/commit'） */
  redirectPath: string;
  /** ボタンの文言。既定は「Googleで続ける」 */
  label?: string;
  onError?: (message: string) => void;
}

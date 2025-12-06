# personal-color-app

## ローカルでの開発

以下のコマンドを実行すると、開発サーバーを起動し、プロジェクトをローカルで確認できます。

```bash
npm start
```

## GitHub Pages へのデプロイ手順

このプロジェクトは `gh-pages` を使用して GitHub Pages にデプロイできます。

### 1. プロジェクトのビルド

まず、以下のコマンドを実行してプロジェクトをビルドします。これにより、デプロイ用の `dist` ディレクトリが生成されます。

```bash
npm run build
```

### 2. GitHub Pages へのデプロイ

プロジェクトがビルドされたら、以下のコマンドを実行して `gh-pages` ブランチにデプロイします。

```bash
npm run deploy
```

これにより、`dist` ディレクトリの内容が `gh-pages` ブランチにプッシュされ、GitHub Pages が更新されます。

プロジェクトのホームページは [https://koriku221.github.io/personal-color-app](https://koriku221.github.io/personal-color-app) です。

### 404Errorが出たら

```bash
Remove-Item -Recurse -Force .parcel-cache
```
上記を実行して再デプロイ
# Bonsai 2.5D Editor MVP

正面やや上視点で鉢を回しながら配置できる、静的な盆栽鑑賞エディタです。

## 機能

- 鉢の上に `株`、`石`、`苔`、`砂`、`飾り物` を配置
- 内部座標は極座標 `r` / `theta` と高さ `z` を維持
- `potRotation` で鉢を360度回転し、楕円投影で2.5D表示
- 奥側は小さく薄く、手前側は大きく濃く表示
- `layer` と奥行き、`z` を加味して前面優先順位を管理
- オブジェクトをドラッグして `r` / `theta` を更新
- 種類ごとに配置可能な `rMax` と `z` 制限を設定
- 各オブジェクトに `weight` を持たせ、鉢の `maxWeight` と比較
- 配置状態を JSON へ保存、JSON から復元、JSON ファイルとしてダウンロード

## 起動

`index.html` をブラウザで開くだけで動きます。ビルドやサーバー起動は不要です。

## JSON 形式

```json
{
  "version": 2,
  "cameraMode": "front_2_5d",
  "potRotation": 0,
  "pot": {
    "name": "浅丸鉢",
    "maxWeight": 120
  },
  "objects": [
    {
      "id": "tree-1",
      "type": "tree",
      "name": "黒松の株",
      "r": 30,
      "theta": 270,
      "z": 0,
      "layer": 8,
      "weight": 46,
      "scale": 1.1,
      "rotation": 0
    }
  ]
}
```

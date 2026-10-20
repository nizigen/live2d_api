#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从 motions.json 生成 model3.json / index.json。

motions.json 是动作映射的唯一事实来源：
    idle     待机循环播的动作
    tap      点击/划过时随机播的动作（live2d-widget 的 TapBody 组）
    extra    只单独成组、不自动播的动作
    hitArea  TapBody 命中检测用的 drawable id

用法：
    python tools/build-model3.py            # 处理 model/5732 下所有模型
    python tools/build-model3.py Shalom_5   # 只处理一个
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODEL_DIR = ROOT / "model" / "5732"

EYE_BLINK = ["ParamEyeLOpen", "ParamEyeROpen"]


def build(model_dir: Path) -> None:
    cfg = json.loads((model_dir / "motions.json").read_text(encoding="utf-8"))
    name = model_dir.name
    moc = next(model_dir.glob("*.moc3")).name
    textures = sorted(f"textures/{p.name}" for p in model_dir.joinpath("textures").iterdir()
                      if p.suffix.lower() in (".png", ".webp"))

    def entry(motion, fade):
        path = model_dir / "motions" / f"{motion}.motion3.json"
        if not path.exists():
            raise FileNotFoundError(path)
        return {"File": f"motions/{motion}.motion3.json", "FadeInTime": fade, "FadeOutTime": fade}

    motions = {}
    if cfg.get("idle"):
        motions["Idle"] = [entry(m, 0.4) for m in cfg["idle"]]
    if cfg.get("tap"):
        motions["TapBody"] = [entry(m, 0.25) for m in cfg["tap"]]
    for m in cfg.get("extra", []):
        motions[m] = [entry(m, 0.25)]

    data = {
        "Version": 3,
        "FileReferences": {
            "Moc": moc,
            "Textures": textures,
            "Motions": motions,
            "Groups": [{"Target": "Parameter", "Name": "EyeBlink", "Ids": EYE_BLINK}],
            "HitAreas": [{"Name": "Body", "Id": cfg["hitArea"]}] if cfg.get("hitArea") else [],
        },
    }

    text = json.dumps(data, ensure_ascii=False, indent=2)
    (model_dir / f"{name}.model3.json").write_text(text, encoding="utf-8")
    (model_dir / "index.json").write_text(text, encoding="utf-8")
    print(f"[ok] {name}: idle={len(cfg.get('idle', []))} tap={len(cfg.get('tap', []))} "
          f"extra={len(cfg.get('extra', []))} hit={cfg.get('hitArea') or '-'}")


def main() -> int:
    targets = sys.argv[1:]
    dirs = [MODEL_DIR / t for t in targets] if targets else sorted(d for d in MODEL_DIR.iterdir() if d.is_dir())
    for d in dirs:
        build(d)
    return 0


if __name__ == "__main__":
    sys.exit(main())

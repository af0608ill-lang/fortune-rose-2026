from flask import Flask, render_template, request, jsonify
from collections import Counter

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/game_clear', methods=['POST'])
def game_clear():
    data = request.json
    # Expects: {'colors': ['red', 'yellow', 'red', ...]} (length 5)
    colors = data.get('colors', [])
    
    if not colors or len(colors) < 5:
        # Fallback
        colors = ['red', 'red', 'red', 'red', 'red']
        
    first = colors[0]
    last = colors[-1]
    
    # Calculate MOST
    counts = Counter(colors)
    # If tie? strict logic just takes most_common(1)[0]
    if not counts:
        most = 'red'
    else:
        most = counts.most_common(1)[0][0]
    
    # Generate Key for 27 patterns
    key = (first, last, most)
    
    # 27 Pattern Dictionary
    fortunes = {
        ('red', 'red', 'red'): "情熱が爆発する一年！\nあなたの勢いは誰にも止められません。",
        ('red', 'red', 'yellow'): "エネルギッシュかつ朗らかに。\n人気運が急上昇しそうです。",
        ('red', 'red', 'purple'): "情熱の中に気品が宿ります。\nカリスマ性を発揮できるでしょう。",
        
        ('red', 'yellow', 'red'): "始まりも終わりも情熱的。\n中盤の楽しみがカギを握ります。",
        ('red', 'yellow', 'yellow'): "明るい未来へ突き進む年。\n笑顔が最高の武器になります。",
        ('red', 'yellow', 'purple'): "行動力と知恵のバランスが最高。\n予期せぬ成功を手にするかも。",
        
        ('red', 'purple', 'red'): "運命の歯車が、静かに動き出す。\n迷いを脱ぎ捨て、高みを目指す時。",
        ('red', 'purple', 'yellow'): "リーダーシップを発揮しつつ、\n周囲への配慮も忘れない素敵な年に。",
        ('red', 'purple', 'purple'): "精神的に大きく成長できる年。\n深い洞察力が身につきます。",
        
        ('yellow', 'red', 'red'): "楽しさから始まり情熱で締める。\n最後まで駆け抜ける一年です。",
        ('yellow', 'red', 'yellow'): "天真爛漫さが愛される一年。\n失敗を恐れず挑戦して吉。",
        ('yellow', 'red', 'purple'): "好奇心と探究心が融合。\n新しい趣味が大成する予感。",
        
        ('yellow', 'yellow', 'red'): "輝きに満ちた一年。\n最後のひと踏ん張りが勝利を呼びます。",
        ('yellow', 'yellow', 'yellow'): "圧倒的幸福感！\n笑顔が絶えない最高の一年になるでしょう。",
        ('yellow', 'yellow', 'purple'): "楽しさの中に学びがある年。\n知的探求が金運アップの鍵。",
        
        ('yellow', 'purple', 'red'): "柔軟な発想で危機を回避。\n最後は情熱で押し切れます。",
        ('yellow', 'purple', 'yellow'): "直感と理性が冴え渡る。\nあなたのアイデアが世界を変えるかも。",
        ('yellow', 'purple', 'purple'): "神秘的な魅力で人を惹きつけます。\n芸術的な才能が開花しそう。",
        
        ('purple', 'red', 'red'): "冷静な分析から行動へ。\n計画通りに物事が進むでしょう。",
        ('purple', 'red', 'yellow'): "一見クールでもハートは熱く。\nギャップ萌えで人気者に。",
        ('purple', 'red', 'purple'): "とことん我が道を行く年。\n独自のスタイルが確立されます。",
        
        ('purple', 'yellow', 'red'): "知的に始まり情熱的に終わる。\nドラマチックな一年になります。",
        ('purple', 'yellow', 'yellow'): "クールな知性と明るい笑顔。\n最強の愛されキャラになれそう。",
        ('purple', 'yellow', 'purple'): "直感力が最高潮に達します。\n迷ったときは直感を信じて正解。",
    }
    
    # Fallback
    msg = fortunes.get(key, "未知なる可能性を秘めた一年。\n自分自身で運命を切り開きましょう！")
    
    return jsonify({'message': msg})

import os

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)

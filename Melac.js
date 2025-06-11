/**
メラクの涙: 
[使用時]体力が最大値の10%減少
[攻撃後]自分を除く現体力の比率が最も低い味方三名が、体力最大値の5/15%回復
 */

const main = async () => {
    console.log("=== メラクの涙マクロ開始 ===");
    
    // 早期リターン
    if(canvas.tokens.controlled.length === 0) {
        console.log("エラー: トークンが選択されていません");
        ui.notifications.warn("トークンが選択されていません。");
        return;
    }

    console.log(`選択されたトークン数: ${canvas.tokens.controlled.length}`);
    console.log(`選択されたトークン: ${canvas.tokens.controlled[0].name}`);

    const options = {
        title: "メラクの涙",
        content: "<p>回復させる体力の割合を選択してください：</p>",
        buttons: {
            five: {
                label: "5%の体力を回復させる(SAN値チェック失敗時)",
                callback: async () => healHp(0.05)
            },
            fifteen: {
                label: "15%の体力を回復させる(SAN値チェック成功時)",
                callback: async () => healHp(0.15)
            }
        },
        default: "five"
    };
    // await new Dialog(options).render(true);
    await Dialog.wait(options);
    
    console.log("=== メラクの涙マクロ終了 ===");
    
    // 10%の体力を減少させる(本マクロは攻撃後に行うため、別途行うものとする)
    // await decreaseMyHp(0.10);
}

// 自身の体力を減少させる関数
const decreaseMyHp = async (percent) => {
    console.log(`=== 自身のHP減少処理開始 (${percent * 100}%) ===`);
    
    const selectedToken = canvas.tokens.controlled[0];
    const actor = selectedToken.actor;
    const hp = actor.system.attributes.hp;
    
    console.log(`対象: ${selectedToken.name}`);
    console.log(`現在HP: ${hp.value}/${hp.max}`);
    
    const hpToReduce = Math.floor(hp.max * percent);
    const newHp = Math.max(hp.value - hpToReduce, 0);
    
    console.log(`減少HP: ${hpToReduce}`);
    console.log(`新しいHP: ${newHp}`);
    
    actor.update({ 'system.attributes.hp.value': newHp });
    // ユーザーに通知
    ui.notifications.info(`あなたは体力を${hpToReduce}減少させました（${percent * 100}%）。`);
    
    console.log(`=== 自身のHP減少処理完了 ===`);
}


const healHp = async (percent) => {
    console.log(`=== HP回復処理開始 (${percent * 100}%) ===`);
    
    // 自分のトークンを取得する
    const selectedToken = canvas.tokens.controlled[0];
    console.log(`実行者: ${selectedToken.name}`);
    
    // 自分以外全員のトークンを取得する
    const allTokens = canvas.tokens.placeables;
    console.log(`全トークン数: ${allTokens.length}`);
    
    const characters = allTokens
        .filter(token => token.actor.type === "character")
        // 血が出てくるということは生きているということ
        .filter(token => !!token.actor.system.attributes.stackBleeding)
        // コマ設定を参照。disposition = 1は友好的 
        .filter(token => token.document.disposition === 1)
        .filter(token => selectedToken.id !== token.id);

    console.log(`回復対象候補数: ${characters.length}`);
    characters.forEach(token => {
        const hp = token.actor.system.attributes.hp;
        console.log(`候補: ${token.name} - HP: ${hp.value}/${hp.max} (${(hp.value/hp.max*100).toFixed(1)}%)`);
    });

    // HP割合が低い順に並べる
    const sortedCharacters = characters
        .map(token => ({
            token,
            hpRatio: token.actor.system.attributes.hp.value / token.actor.system.attributes.hp.max
        }))
        .sort((a, b) => a.hpRatio - b.hpRatio);
    
    console.log("=== HP割合順ソート結果 ===");
    sortedCharacters.forEach((char, index) => {
        console.log(`${index + 1}位: ${char.token.name} - HP比率: ${(char.hpRatio * 100).toFixed(1)}%`);
    });
    
    // 3人までに制限
    const worst3SortedCharacters = sortedCharacters.slice(0, 3);
    
    console.log(`=== 実際の回復対象 (上位${worst3SortedCharacters.length}名) ===`);
    
    // ワースト3位のHPを回復する
    worst3SortedCharacters.forEach(({ token }, index) => {
        const hp = token.actor.system.attributes.hp;
        const maxHp = hp.max;
        const healHp = Math.floor(maxHp * percent);
        const newHp = Math.min(hp.value + healHp, maxHp);
        
        console.log(`${index + 1}. ${token.name}:`);
        console.log(`  回復前HP: ${hp.value}/${maxHp}`);
        console.log(`  回復量: ${healHp}`);
        console.log(`  回復後HP: ${newHp}/${maxHp}`);
        
        token.actor.update({ 'system.attributes.hp.value': newHp });
        ui.notifications.info(`${token.name}の体力を${healHp}回復させました（${percent * 100}%）。`);
    });
    
    if (worst3SortedCharacters.length === 0) {
        console.log("回復対象が見つかりませんでした");
        ui.notifications.warn("回復対象が見つかりませんでした。");
    }
    
    console.log(`=== HP回復処理完了 ===`);
    return ;
}

main();
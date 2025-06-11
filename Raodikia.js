/**
 * ラオディキアの葬花: [使用時]味方全員の混乱抵抗値を最大値の25%回復する。
 */

const main = async () => {
    console.log("=== ラオディキアの葬花マクロ開始 ===");
    
    // 早期リターン
    if(canvas.tokens.controlled.length === 0) {
        console.log("エラー: トークンが選択されていません");
        ui.notifications.warn("トークンが選択されていません。");
        return;
    }

    console.log(`選択されたトークン数: ${canvas.tokens.controlled.length}`);
    console.log(`選択されたトークン: ${canvas.tokens.controlled[0].name}`);

    // 混乱抵抗値を25%回復
    await increaseConf(0.25);
    
    console.log("=== ラオディキアの葬花マクロ終了 ===");
}

const increaseConf = async (percent) => {
    console.log(`=== 混乱抵抗値回復処理開始 (${percent * 100}%) ===`);
    
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
        .filter(token => !!token.actor.system.attributes.isPlayer?.value)
        // コマ設定を参照。disposition = 1は友好的 
        .filter(token => token.document.disposition === 1)
        .filter(token => selectedToken.id !== token.id);

    console.log(`回復対象候補数: ${characters.length}`);
    characters.forEach(token => {
        const conf = token.actor.system.attributes.conf;
        console.log(`候補: ${token.name} - 混乱抵抗値: ${conf.value}/${conf.max}`);
    });

    characters.forEach(token => {
        const maxConf = token.actor.system.attributes.conf.max;
        const conf = token.actor.system.attributes.conf.value;

        const recoverConf = Math.floor(maxConf * percent);
        const newConf = Math.min(conf + recoverConf, maxConf);

        console.log(`${token.name}:`);
        console.log(`  回復前混乱抵抗値: ${conf}/${maxConf}`);
        console.log(`  回復量: ${recoverConf}`);
        console.log(`  回復後混乱抵抗値: ${newConf}/${maxConf}`);

        token.actor.update({ 'system.attributes.conf.value': newConf });
        ui.notifications.info(`${token.name}の混乱抵抗値を${recoverConf}回復しました（${percent * 100}%）。`);
    });

    if (characters.length === 0) {
        console.log("回復対象が見つかりませんでした");
        ui.notifications.warn("回復対象が見つかりませんでした。");
    }
    
    console.log(`=== 混乱抵抗値回復処理完了 ===`);
    return ;
}

main();
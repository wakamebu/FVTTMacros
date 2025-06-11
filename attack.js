// --- GODトークンのアクターIDを適宜入れてね ---
const GOD_ACTOR_ID = "CVlv6QBjAO5jpl28";

const main = () => {
  const godActor = game.actors.get(GOD_ACTOR_ID);
  check(godActor, "GODのactor_idを正しく入力してください");

  const attacker = actor;
  check(attacker, "キャラクターを選択してから再度実行してください");

  console.log("攻撃者のダメージ入力処理を開始");

  const normalPercentage = calcNormalDamagePercentage(attacker);
  const specialPercentage = calcSpecialDamagePercentage(attacker);

  console.log("normalDamagePercentage : " + normalPercentage);
  console.log("specialDamagePercentage : " + specialPercentage);

  sendMessage(
    "攻撃者のダメージ入力処理終了" +
      "<br/>" +
      "攻撃者通常% : " +
      normalPercentage +
      "<br/>" +
      "攻撃者特殊% : " +
      specialPercentage
  );

  godActor.modifyTokenAttribute(
    "attributes.normalDamagePercentage",
    normalPercentage
  );
  godActor.modifyTokenAttribute(
    "attributes.specialDamagePercentage",
    specialPercentage
  );
};

const calcNormalDamagePercentage = (attacker) => {
  let percentage = 0;

  // ダメージ上昇
  const stackDamageUp = getAttributeValue(attacker, "stackDamageUp");
  // ダメージ減少
  const stackDamageDown = getAttributeValue(attacker, "stackDamageDown");
  // is直接攻撃
  const isDirect = getAttributeValue(attacker, "directcheck");

  percentage += stackDamageUp * 10;
  percentage -= stackDamageDown * 10;
  percentage += isDirect ? 50 : 0;
  return percentage;
};

const calcSpecialDamagePercentage = (attacker) => {
  let specialPercentage = 0;

  // isクリティカル（既存）
  const isCritical = getAttributeValue(attacker, "criticalcheck");
  if (isCritical) {
    specialPercentage += 20;
  }

  // stackpoiseによるクリティカル判定（新規追加）
  const stackPoise = getAttributeValue(attacker, "stackpoise");
  if (stackPoise > 0) {
    // 1スタックにつき5%の確率でクリティカル
    const criticalChance = Math.min(stackPoise * 5, 100); // 最大100%
    const randomRoll = Math.random() * 100;

    console.log(
      `stackpoise: ${stackPoise}, クリティカル確率: ${criticalChance}%, ダイス結果: ${randomRoll.toFixed(
        2
      )}%`
    );

    if (randomRoll < criticalChance) {
      console.log("stackpoiseによるクリティカル発生！");
      specialPercentage += 20;
      playSoundFromPlaylist("Coin Mul");

      // クリティカル発生をメッセージで通知
      sendMessage(
        `${attacker.name}の呼吸(${stackPoise})によりクリティカルが発生しました。`
      );
    } else {
      console.log("stackpoiseによるクリティカル失敗");
    }
  }

  return specialPercentage;
};

const getAttributeValue = (actor, attribute_name) => {
  const value = actor.system.attributes[attribute_name].value;
  checkNotNull(value, attribute_name + " が定義されていません");
  console.log(actor.name + "の" + attribute_name + "は" + value);
  return value;
};

// 内部の状態が正常か確認する関数
// conditionがfalseの場合にエラーメッセージを出力して処理を終わらせる
const check = (condition, message = "IllegalStateException") => {
  if (!condition) {
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ token: actor }),
      content: message,
    });
    throw new Error(message);
  }
};

// 内部の状態が正常か確認する関数
// conditionがnullの場合にエラーメッセージを出力して処理を終わらせる
const checkNotNull = (condition, message = "IllegalStateException") => {
  if (condition === null || condition === undefined) {
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ token: actor }),
      content: message,
    });
    throw new Error(message);
  }
};

// 与えられた入力が正常か確認する関数
// conditionがfalseの場合にエラーメッセージを出力して処理を終わらせる
const require = (condition, message = "IllegalArgumentException") => {
  if (!condition) {
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ token: actor }),
      content: message,
    });
    throw new Error(message);
  }
};
const sendMessage = (content) => {
  ChatMessage.create({
    content: content,
  });
};

const playSoundFromPlaylist = (soundName) => {
  // プレイリストからサウンドを取得
  const playlist = game.playlists.getName("effect"); // プレイリストの名前を指定
  if (playlist) {
    const track = playlist.sounds.find((s) => s.name === soundName);
    if (track) {
      // サウンドファイルのURLを取得
      const soundUrl = track.path;
      if (soundUrl) {
        // サウンドを再生
        new Audio(soundUrl).play();
      } else {
        console.log(`サウンド '${soundName}' のURLが取得できませんでした。`);
      }
    } else {
      console.log(
        `サウンド '${soundName}' がプレイリストに見つかりませんでした。`
      );
    }
  } else {
    console.log("指定されたプレイリストが見つかりませんでした。");
  }
};

main();

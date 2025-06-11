const GOD_ACTOR_ID = "CVlv6QBjAO5jpl28";

const main = async () => {
  const actor = canvas.tokens.controlled[0]?.actor;
  if (!actor) {
    console.log("actorを取得できなかったため終了: ダメージ処理マクロ");
    ui.notifications.error("トークンを選択してください。");
    return;
  }

  const baseDamage = Number(scope.damage);
  require(Number.isFinite(baseDamage), "damageの数字を入力してください");

  const godActor = game.actors.get(GOD_ACTOR_ID);
  check(godActor, "GODのactor_idを正しく入力してください");

  const receiver = actor;
  check(receiver, "キャラクターを選択してから再度実行してください");

  console.log("受け手のダメージ反映処理を開始");

  const receiverNormalPercentage = calcNormalDamagePercentage(receiver);
  const receiverSpecialPercentage = calcSpecialDamagePercentage(receiver);
  const receiverSpecialConfPercentage =
    calcSpecialConfDamagePercentage(receiver);

  console.log("godから倍率を取得");
  const attackerNormalPercentage =
    godActor.system.attributes["normalDamagePercentage"].value;
  const attackerSpecialPercentage =
    godActor.system.attributes["specialDamagePercentage"].value;

  const normalRatio =
    (100 + attackerNormalPercentage - receiverNormalPercentage) / 100;
  const specialRatio =
    (100 + attackerSpecialPercentage - receiverSpecialPercentage) / 100;
  const specialConfRatio =
    (100 + attackerSpecialPercentage - receiverSpecialConfPercentage) / 100;

  const dealDamage =
    baseDamage *
    (normalRatio > 0 ? normalRatio : 0) *
    (specialRatio > 0 ? specialRatio : 0);
  const dealConfDamage =
    baseDamage *
    (normalRatio > 0 ? normalRatio : 0) *
    (specialConfRatio > 0 ? specialConfRatio : 0);

  let name = receiver.name;

  sendMessage(
    name +
      "の物理的実体に" +
      Math.ceil(dealDamage) +
      "ダメージを確認しました。" +
      "<br/>" +
      name +
      "の耐性限界値に" +
      Math.ceil(dealConfDamage) +
      "ダメージを確認しました。" +
      "<br/>"
  );

  const ceiledDealDamage = Math.ceil(dealDamage);
  applyHPDamage(receiver, ceiledDealDamage);
  applyConfDamage(receiver, Math.ceil(dealConfDamage));
  handleDebuffs(receiver, ceiledDealDamage);
};

const applyHPDamage = (receiver, damage) => {
  let hp = receiver.system.attributes.hp.value;
  let barrier = receiver.system.attributes.barrier.value;

  if (barrier > 0) {
    const absorbed = Math.min(barrier, damage);
    barrier -= absorbed;
    damage -= absorbed;
  }

  if (damage > 0) {
    hp -= damage;
  }

  receiver.update({
    "system.attributes.hp.value": hp,
    "system.attributes.barrier.value": barrier,
  });
};

const applyConfDamage = (receiver, damage) => {
  let constitution = receiver.system.attributes.constitution.value;
  let barrier = receiver.system.attributes.barrier.value;
  const isDoubleConstitution =
    getAttributeValue(receiver, "doubleconstitution", 0) === 1;

  if (isDoubleConstitution) {
    constitution -= damage * 2;
  } else {
    constitution -= damage;
  }
  receiver.update({
    "system.attributes.constitution.value": Math.max(constitution, 0),
  });
};

const calcNormalDamagePercentage = (receiver) => {
  let percentage = 0;
  // 保護効果
  const stackProtection = getAttributeValue(receiver, "stackProtection", 0);
  // 脆弱効果
  const stackVulnerable = getAttributeValue(receiver, "stackVulnerable", 0);

  percentage += stackProtection * 10;
  percentage -= stackVulnerable * 10;
  console.log(`calcNormalDamagePercentage: ${percentage}%`);
  return percentage;
};

const calcSpecialDamagePercentage = (receiver) => {
  let percentage = 0;
  const isPlayer = receiver.system.attributes.isPlayer.value === "1";
  const resistance = isPlayer
    ? getAttributeValue(receiver, "resist", 0)
    : getAttributeValue(receiver, "resistEnemy", 0);

  if (getAttributeValue(receiver, "constitution", 0) <= 0) {
    console.log("混乱状態: 特殊ダメージ倍率を -100% に設定");
    return -100;
  }

  percentage += resistance;
  console.log(`calcSpecialDamagePercentage: ${percentage}%`);
  return percentage;
};

const calcSpecialConfDamagePercentage = (receiver) => {
  let percentage = 0;
  const isPlayer = receiver.system.attributes.isPlayer.value === "1";
  console.log(`${receiver.name}のisPlayer判定: ${isPlayer}`);
  console.log(
    `receiver.system.attributes.isPlayer の値: ${receiver.system.attributes.isPlayer.value}`
  );

  const resistance = isPlayer
    ? getAttributeValue(receiver, "confResist", 0)
    : getAttributeValue(receiver, "econfResistEnemy", 0);

  if (getAttributeValue(receiver, "constitution", 0) <= 0) {
    console.log("混乱状態: 特殊ダメージ倍率を -100% に設定");
    return -100;
  }

  percentage += resistance;
  console.log(`calcSpecialConfDamagePercentage: ${percentage}%`);
  return percentage;
};

const handleDebuffs = (actor, damage) => {
  // 例として、デバフ "沈潜" を処理
  const stacksinkValue = getAttributeValue(actor, "stacksink", 0);
  if (stacksinkValue > 0) {
    // stacksinkの値に応じたSANダメージ
    const SanityDamage = stacksinkValue;
    applySanityDamage(actor, SanityDamage);
    const halfStack = Math.floor(stacksinkValue / 2);
    actor.update({
      "system.attributes.stacksink.value": halfStack,
    });
    ui.notifications.info(
      `**${actor.name}** は「沈潜」のデバフにより、SANにダメージ **${Math.ceil(
        SanityDamage
      )}** を受けます。`
    );
    console.log(`stacksink処理: before=${stacksinkValue}, after=${halfStack}`);
  }
};

const applySanityDamage = (receiver, damage) => {
  let hp = getAttributeValue(receiver, "hp", 0);
  let san = getAttributeValue(receiver, "san", 0);

  if (san > 0) {
    const absorbed = Math.min(san, damage);
    san -= absorbed;
    damage -= absorbed;
  }

  if (damage > 0) {
    hp -= damage;
  }

  receiver.update({
    "system.attributes.hp.value": hp,
    "system.attributes.san.value": san,
  });
};

const getAttributeValue = (actor, attribute_name, defaultValue = 0) => {
  const attribute = actor.system.attributes[attribute_name];
  if (attribute && attribute.value !== undefined && attribute.value !== null) {
    console.log(`${actor.name}の${attribute_name}は${attribute.value}`);
    return attribute.value;
  } else {
    console.log(
      `${actor.name}の${attribute_name}は定義されていません。デフォルト値 ${defaultValue} を使用します。`
    );
    return defaultValue;
  }
};

const check = (condition, message = "IllegalStateException") => {
  if (!condition) {
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ token: canvas.tokens.controlled[0] }),
      content: message,
    });
    throw new Error(message);
  }
};

const require = (condition, message = "IllegalArgumentException") => {
  if (!condition) {
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ token: canvas.tokens.controlled[0] }),
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

// --- メイン関数の実行 ---
main();

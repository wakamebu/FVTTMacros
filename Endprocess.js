//更新履歴
//4.26 呼吸・束縛・沈潜・振動・再生処理追加
//4.26 出血処理 3/4繰り下げ→2/3繰り上げへ
//6.12 点火処理を追加
//9.07 applyFrenzyWhenTurnStart(characterList); 以下追加
//9.20 同期処理の修正と全体的なrewark
//2024.09.30 同期処理の修正と全体的なrewark2 by van

const main = async () => {
  await turnEnd();
  if (game.combat) game.combat.nextRound();
  await ui.notifications.warn("次ラウンド開始");
  await turnStart();
};

// ユーティリティ関数
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

const sendMessage = (content) => {
  ChatMessage.create({
    content: content,
  });
};

const calcDamage = (character, damage) => {
  let hp = character.hp;
  let barrier = character.barrier;

  if (barrier > 0) {
    const absorbed = Math.min(barrier, damage);
    barrier -= absorbed;
    damage -= absorbed;
  }
  if (damage > 0) {
    hp -= damage;
  }

  character.hp = hp;
  character.barrier = barrier;

  return character;
};

const calcHeal = (character, heal) => {
  console.log(`回復前の${character.entity.name}のHP = ${character.hp}`);
  let hp = character.hp;
  const maxhp = character.maxhp;

  hp += heal;
  if (hp > maxhp) {
    hp = maxhp;
  }

  character.hp = hp;
  console.log(`回復後の${character.entity.name} HP = ${character.hp}`);
  return character;
};

const getCharacterList = () => {
  const character = canvas.tokens
    .controlAll()
    .map((x) => x.actor)
    .filter((x) => x.type === "character")
    // とりあえず出血ステータスがあるかどうかでプレイヤーか見分けることにする
    .filter((x) => !!x.system.attributes.stackBleeding);
  console.log("処理対象のキャラクターリスト:", character);
  return character;
};

// ターン終了時処理
const turnEnd = async () => {
  console.log("turnEnd 関数が実行されました。");
  const characterList = getCharacterList().map((x) => {
    const attrs = x.system.attributes;
    const requiredAttributes = [
      "hp",
      "barrier",
      "stackfrenzy",
      "stackSinsyoku",
      "constitution",
      "stackregen",
      "stackBurned",
      "stackbind",
      "checknk",
      "checkSora",
      "stacksink",
      "stacktremor",
      "stackpoise",
      "stackParalysis",
      "stackFear",
      "stackDamageDown",
      "stackVulnerable",
      "stackPowerDown",
      "stackDamageUp",
      "stackProtection",
      "stackPowerUp",
      "stackFEOAwaken",
      "stackbiribiri",
      "stackPoison",
      "isPlayer",
      "checkseikou",
      "stackBleeding",
      "stackDarkFire",
      "stackSmokeGrand",
      "stackSmoke",
    ];

    // 不足している属性をチェック
    const missingAttributes = requiredAttributes.filter(
      (attr) => !(attr in attrs)
    );
    if (missingAttributes.length > 0) {
      console.warn(
        `${x.name} の以下の属性が不足しています: ${missingAttributes.join(
          ", "
        )}`
      );
    }

    return {
      entity: x,
      hp: attrs.hp?.value ?? 0,
      maxhp: attrs.hp?.max ?? 0,
      barrier: attrs.barrier?.value ?? 0,
      stackfrenzy: attrs.stackfrenzy?.value ?? 0,
      stackSinsyoku: attrs.stackSinsyoku?.value ?? 0,
      constitution: attrs.constitution?.value ?? 0,
      stackregen: attrs.stackregen?.value ?? 0,
      stackBurned: attrs.stackBurned?.value ?? 0,
      stackbind: attrs.stackbind?.value ?? 0,
      checknk: attrs.checknk?.value ?? 0,
      checkSora: attrs.checkSora?.value ?? 0,
      stacksink: attrs.stacksink?.value ?? 0,
      stacktremor: attrs.stacktremor?.value ?? 0,
      stackpoise: attrs.stackpoise?.value ?? 0,
      stackParalysis: attrs.stackParalysis?.value ?? 0,
      stackFear: attrs.stackFear?.value ?? 0,
      stackDamageDown: attrs.stackDamageDown?.value ?? 0,
      stackVulnerable: attrs.stackVulnerable?.value ?? 0,
      stackPowerDown: attrs.stackPowerDown?.value ?? 0,
      stackDamageUp: attrs.stackDamageUp?.value ?? 0,
      stackProtection: attrs.stackProtection?.value ?? 0,
      stackPowerUp: attrs.stackPowerUp?.value ?? 0,
      stackPoison: attrs.stackPoison?.value ?? 0,
      isPlayer: attrs.isPlayer?.value ?? false,
      checkseikou: attrs.checkseikou?.value ?? 0,
      stackBleeding: attrs.stackBleeding?.value ?? 0,
      stackDarkFire: attrs.stackDarkFire?.value ?? 0,
      stackbiribiri: attrs.stackbiribiri?.value ?? 0,
      stackFEOAwaken: attrs.stackFEOAwaken?.value ?? 0,
      stackSmokeGrand: attrs.stackSmokeGrand?.value ?? 0,
      stackSmoke: attrs.stackSmoke?.value ?? 0,
      messages: [],
    };
  });

  // 状態異常処理関数
  const applyDarkFireWhenTurnEnd = (characterList) => {
    characterList
      .filter((x) => x.stackDarkFire > 0 && x.stackBurned > 0)
      .forEach((x) => {
        console.log(`${x.entity.name} に対して黒炎処理`);
        const darkFireDamage = x.stackDarkFire * x.stackBurned;
        calcDamage(x, darkFireDamage);
        x.stackDarkFire = 0;
        x.messages.push(`黒炎によるダメージ: ${darkFireDamage}`);
      });
  };

  const addFrenzyWhenTurnEnd = (characterList) => {
    characterList
      .filter((x) => x.entity.system.attributes.checkfrenzy?.value > 0)
      .forEach((x) => {
        const halfhp = Math.floor(x.entity.system.attributes.hp.max / 2);
        const beforeStack = x.entity.system.attributes.stackfrenzy.value;
        if (x.entity.system.attributes.hp.value <= halfhp) {
          x.stackfrenzy += 1;
          x.messages.push(`狂乱が1増加しました。`);
        }
      });
  };

  const applyShinsyokuWhenTurnEnd = (characterList) => {
    console.log("applyShinsyokuWhenTurnEnd 関数が呼び出されました。");
    console.log(characterList);
    characterList
      .filter((x) => x.stackSinsyoku > 2)
      .filter((x) => (x.entity.system.attributes?.checkAnri.value ?? 0) < 1)
      .forEach((x) => {
        console.log(`${x.entity.name} に対して侵食処理`);
        const shinsyokuDamage = x.stackSinsyoku;
        x = calcDamage(x, shinsyokuDamage);
        x.constitution -= shinsyokuDamage;
        x.messages.push(`侵食処理`);
      });
  };

  const applyHealingToRandomPlayer = (characterList) => {
    console.log("applyHealingToRandomPlayer 関数が呼び出されました。");
    // checkseikouが1のキャラクターの数をカウント
    const healingCount = characterList.filter(
      (x) => x.checkseikou === 1
    ).length;
    console.log(
      `Healing will be applied ${healingCount} times based on checkseikou count.`
    );

    if (healingCount === 0) {
      console.log(
        "checkseikouが1のキャラクターがいないため、回復処理を行いません。"
      );
      return;
    }

    for (let i = 0; i < healingCount; i++) {
      // isPlayerを持っていて、HPが減少しているキャラクターをフィルタリング
      const playerCharacters = characterList.filter((x) => x.isPlayer);
      const validPlayers = playerCharacters.filter((x) => x.hp < x.maxhp);

      console.log(
        `Healing iteration ${i + 1}: Valid Players:`,
        validPlayers.map((x) => x.entity.name)
      );

      if (validPlayers.length === 0) {
        console.log("回復処理を行う有効なプレイヤーキャラクターがいません。");
        break;
      }

      // ランダムに1人のプレイヤーを選択
      const randomIndex = Math.floor(Math.random() * validPlayers.length);
      const selectedCharacter = validPlayers[randomIndex];
      console.log(`${selectedCharacter.entity.name} のHPを回復します。`);
      console.log(`Before Healing: HP = ${selectedCharacter.hp.value}`);

      // 回復量を指定
      const healingAmount = Math.floor(Math.random() * 2) + 1; // 1-2回復する
      calcHeal(selectedCharacter, healingAmount);

      console.log(`After Healing: HP = ${selectedCharacter.hp.value}`);
      console.log(
        `${selectedCharacter.entity.name} のHPが${healingAmount}回復しました。`
      );
      selectedCharacter.messages.push(`HPが${healingAmount}回復しました。`);
    }
  };

  const applyRegenWhenTurnEnd = (characterList) => {
    characterList
      .filter((x) => x.stackregen > 0)
      .forEach((x) => {
        console.log(`${x.entity.name} に対して再生処理`);
        x.stackregen -= 1;
        x.messages.push(`再生処理`);
      });
  };

  const applyAwakenWhenTurnEnd = (characterList) => {
    characterList
      .filter((x) => x.stackFEOAwaken > 0)
      .forEach((x) => {
        console.log(`${x.entity.name} に対してFEO覚醒減少処理`);
        x.stackFEOAwaken -= 1;
        x.messages.push(`FEO覚醒処理`);
      });
  };

  const applyBindWhenTurnEnd = (characterList) => {
    characterList
      .filter((x) => x.stackbind > 0)
      .forEach((x) => {
        console.log(`${x.entity.name} に対して束縛処理`);
        x.stackbind = 0;
        x.messages.push(`束縛処理`);
      });
  };

  const applySinkWhenTurnEnd = (characterList) => {
    characterList
      .filter((x) => x.stacksink > 0 || x.checknk > 0) // 修正: 'or' を '||' に変更
      .forEach((x) => {
        console.log(`${x.entity.name} に対して沈潜処理`);
        if (x.checknk >= 1) {
          x.stacksink += 2;
          x.messages.push(`沈潜が増加`);
        } else {
          x.stacksink -= 1;
        }
        x.messages.push(`沈潜処理`);
      });
  };

  const applySmokeWhenTurnEnd = (characterList) => {
    characterList
      .filter((x) => x.checkSora > 0)
      .forEach((x) => {
        console.log(`${x.entity.name} に対して煙付与`);
        x.stackSmoke += 7;
        x.messages.push(`煙付与`);
      });
  };

  const applyTremorWhenTurnEnd = (characterList) => {
    characterList
      .filter((x) => x.stacktremor > 0)
      .forEach((x) => {
        console.log(`${x.entity.name} に対して振動処理`);
        calcDamage(x, x.stacktremor);
        x.stacktremor = Math.floor((x.stacktremor / 3) * 2);
        x.messages.push(`振動処理`);
      });
  };

  const applyPoiseWhenTurnEnd = (characterList) => {
    characterList
      .filter((x) => x.stackpoise > 0)
      .forEach((x) => {
        console.log(`${x.entity.name} に対して呼吸処理`);
        x.stackpoise -= 1;
        x.messages.push(`呼吸処理`);
      });
  };

  const applyParalysisWhenTurnEnd = (characterList) => {
    characterList
      .filter((x) => x.stackParalysis > 0)
      .forEach((x) => {
        console.log(`${x.entity.name} に対して麻痺処理`);
        x.stackParalysis = 0;
        x.messages.push(`麻痺処理`);
      });
  };

  const applyFearWhenTurnEnd = (characterList) => {
    characterList
      .filter((x) => x.stackFear > 0)
      .forEach((x) => {
        console.log(`${x.entity.name} に対して恐怖処理`);
        x.stackFear = 0;
        x.messages.push(`恐怖処理`);
      });
  };

  const applyDamageDownWhenTurnEnd = (characterList) => {
    characterList
      .filter((x) => x.stackDamageDown > 0)
      .forEach((x) => {
        console.log(`${x.entity.name} に対してダメージ減少処理`);
        x.stackDamageDown = 0;
        x.messages.push(`ダメージ減少処理`);
      });
  };

  const applyVulnerableWhenTurnEnd = (characterList) => {
    characterList
      .filter((x) => x.stackVulnerable > 0)
      .forEach((x) => {
        console.log(`${x.entity.name} に対して脆弱処理`);
        x.stackVulnerable = 0;
        x.messages.push(`脆弱処理`);
      });
  };

  const applyPowerDownWhenTurnEnd = (characterList) => {
    characterList
      .filter((x) => x.stackPowerDown > 0)
      .forEach((x) => {
        console.log(`${x.entity.name} に対して威力減少処理`);
        x.stackPowerDown = 0;
        x.messages.push(`威力減少処理`);
      });
  };

  const applyDamageUpWhenTurnEnd = (characterList) => {
    characterList
      .filter((x) => x.stackDamageUp > 0)
      .forEach((x) => {
        console.log(`${x.entity.name} に対してダメージ上昇処理`);
        x.stackDamageUp = 0;
        x.messages.push(`ダメージ上昇処理`);
      });
  };

  const applyProtectionWhenTurnEnd = (characterList) => {
    characterList
      .filter((x) => x.stackProtection > 0)
      .forEach((x) => {
        console.log(`${x.entity.name} に対して保護処理`);
        x.stackProtection = 0;
        x.messages.push(`保護処理`);
      });
  };

  const applyPowerUpWhenTurnEnd = (characterList) => {
    characterList
      .filter((x) => x.stackPowerUp > 0)
      .forEach((x) => {
        console.log(`${x.entity.name} に対してパワー処理`);
        x.stackPowerUp = 0;
        x.messages.push(`パワー処理`);
      });
  };

  const applyBurnedWhenTurnEnd = (characterList) => {
    characterList
      .filter((x) => x.stackBurned > 0)
      .forEach((x) => {
        console.log(`${x.entity.name} に対してやけど処理`);
        calcDamage(x, x.stackBurned);
        x.stackBurned = Math.floor((x.stackBurned / 3) * 2);
        x.messages.push(`やけど処理`);
        playSoundFromPlaylist("Effect Burn");
      });
  };

  const applyPoisonWhenTurnEnd = (characterList) => {
    characterList
      .filter((x) => x.stackPoison > 0)
      .forEach((x) => {
        console.log(`${x.entity.name} に対して毒処理`);
        calcDamage(x, x.stackPoison);
        x.stackPoison = Math.floor(x.stackPoison / 2);
        x.messages.push(`毒処理`);
      });
  };

  const applyBleedingWhenTurnEnd = (characterList) => {
    characterList
      .filter((x) => x.stackBleeding > 0)
      .forEach((x) => {
        console.log(`${x.entity.name} の出血量を減少処理`);
        const beforeStack = x.stackBleeding;
        // じっとしていれば、出血ダメージは入らない
        let twoThirds = (beforeStack * 2) / 3;
        let checkUp = Math.ceil(twoThirds);
        if (checkUp === beforeStack) {
          checkUp -= 1;
        }
        x.stackBleeding = checkUp;
        x.messages.push(`出血量を減少処理`);
      });
  };

  const eraseBarrierWhenTurnEnd = (characterList) => {
    characterList
      .filter((x) => x.barrier > 0)
      .forEach((x) => {
        console.log(`${x.entity.name} に対してバリア削除処理`);
        x.barrier = 0;
        x.messages.push(`バリア削除処理`);
      });
  };

  // 状態異常処理の適用
  const applyAllEndEffects = (characterList) => {
    applyDarkFireWhenTurnEnd(characterList);
    applyBleedingWhenTurnEnd(characterList);
    applyBurnedWhenTurnEnd(characterList);
    applyPoisonWhenTurnEnd(characterList);
    applyPowerUpWhenTurnEnd(characterList);
    applyProtectionWhenTurnEnd(characterList);
    applyDamageUpWhenTurnEnd(characterList);
    applyDamageDownWhenTurnEnd(characterList);
    applyVulnerableWhenTurnEnd(characterList);
    applyPowerDownWhenTurnEnd(characterList);
    applyParalysisWhenTurnEnd(characterList);
    applyFearWhenTurnEnd(characterList);
    applyPoiseWhenTurnEnd(characterList);
    applyTremorWhenTurnEnd(characterList);
    applySinkWhenTurnEnd(characterList);
    applyBindWhenTurnEnd(characterList);
    applyRegenWhenTurnEnd(characterList);
    applyHealingToRandomPlayer(characterList);
    addFrenzyWhenTurnEnd(characterList);
    applyShinsyokuWhenTurnEnd(characterList);
    eraseBarrierWhenTurnEnd(characterList);
    applyAwakenWhenTurnEnd(characterList);
    applySmokeWhenTurnEnd(characterList);
  };

  applyAllEndEffects(characterList);

  characterList.forEach((x) => {
    if (x.messages.length > 0) {
      sendMessage(x.entity.name + "の状態：<br>" + x.messages.join("<br>"));
    }
  });

  const promises = characterList
    .map((x) => {
      return [
        x.entity.modifyTokenAttribute("attributes.hp", x.hp),
        x.entity.modifyTokenAttribute("attributes.barrier", x.barrier),
        x.entity.modifyTokenAttribute("attributes.stackfrenzy", x.stackfrenzy),
        x.entity.modifyTokenAttribute(
          "attributes.constitution",
          x.constitution
        ),
        x.entity.modifyTokenAttribute(
          "attributes.stackSinsyoku",
          x.stackSinsyoku
        ),
        x.entity.modifyTokenAttribute("attributes.stackregen", x.stackregen),
        x.entity.modifyTokenAttribute("attributes.stackBurned", x.stackBurned),
        x.entity.modifyTokenAttribute("attributes.stackbind", x.stackbind),
        x.entity.modifyTokenAttribute("attributes.stacksink", x.stacksink),
        x.entity.modifyTokenAttribute("attributes.stacktremor", x.stacktremor),
        x.entity.modifyTokenAttribute("attributes.stackpoise", x.stackpoise),
        x.entity.modifyTokenAttribute(
          "attributes.stackParalysis",
          x.stackParalysis
        ),
        x.entity.modifyTokenAttribute("attributes.stackFear", x.stackFear),
        x.entity.modifyTokenAttribute(
          "attributes.stackDamageDown",
          x.stackDamageDown
        ),
        x.entity.modifyTokenAttribute(
          "attributes.stackVulnerable",
          x.stackVulnerable
        ),
        x.entity.modifyTokenAttribute(
          "attributes.stackPowerDown",
          x.stackPowerDown
        ),
        x.entity.modifyTokenAttribute(
          "attributes.stackDamageUp",
          x.stackDamageUp
        ),
        x.entity.modifyTokenAttribute(
          "attributes.stackProtection",
          x.stackProtection
        ),
        x.entity.modifyTokenAttribute(
          "attributes.stackPowerUp",
          x.stackPowerUp
        ),
        x.entity.modifyTokenAttribute("attributes.stackPoison", x.stackPoison),
        x.entity.modifyTokenAttribute(
          "attributes.stackBleeding",
          x.stackBleeding
        ),
        x.entity.modifyTokenAttribute(
          "attributes.stackDarkFire",
          x.stackDarkFire
        ),
        x.entity.modifyTokenAttribute(
          "attributes.stackFEOAwaken",
          x.stackFEOAwaken
        ),
        x.entity.modifyTokenAttribute("attributes.stackSmoke", x.stackSmoke),
        x.entity.modifyTokenAttribute(
          "attributes.stackSmokeGrand",
          x.stackSmokeGrand
        ),
      ];
    })
    .flat();

  return Promise.all(promises);
};

// ターン開始時処理
const turnStart = async () => {
  const characterList = getCharacterList().map((x) => ({
    entity: x,
    hp: x.system.attributes.hp.value,
    barrier: x.system.attributes.barrier.value,
    messages: [],
  }));

  await resetDarkFireWhenTurnStart(characterList);

  // 状態異常適用1
  await Promise.all([
    applyBleedingWhenTurnStart(characterList),
    applyBurnedWhenTurnStart(characterList),
    applyPoisonWhenTurnStart(characterList),
    applyPowerUpWhenTurnStart(characterList),
    applyProtectionWhenTurnStart(characterList),
    applyDamageUpWhenTurnStart(characterList),
    applyDamageDownWhenTurnStart(characterList),
    applyVulnerableWhenTurnStart(characterList),
    applyPowerDownWhenTurnStart(characterList),
    applyParalysisWhenTurnStart(characterList),
    applyFearWhenTurnStart(characterList),
    applyPoiseWhenTurnStart(characterList),
    applyTremorWhenTurnStart(characterList),
    applySinkWhenTurnStart(characterList),
    applyBindWhenTurnStart(characterList),
    applyRegenWhenTurnStart(characterList),
    applyRegenPlusWhenTurnStart(characterList),
    applyWitchStart(characterList),
    applyhitanWhenTurnStart(characterList),
    applyBiribiriWhenTurnStart(characterList),
    applyAwakenWhenTurnStart(characterList),
    applySkmodBySoraWhenTurnStart(characterList),
  ]);

  // 状態異常適用2 ※ダメージ上昇の反映が何回もされるため、適用を分ける
  await Promise.all([applyFrenzyWhenTurnStart(characterList)]);
  // 状態異常適用3
  await Promise.all([applyShinsyokuWhenTurnStart(characterList)]);

  // HP更新
  await Promise.all(
    characterList.map((x) => {
      const beforeHp = x.entity.system.attributes.hp.value;
      return x.entity.modifyTokenAttribute("attributes.hp", x.hp);
    })
  );

  characterList.forEach((x) => {
    if (x.messages.length > 0) {
      sendMessage(x.entity.name + "の状態：<br>" + x.messages.join("<br>"));
    }
  });
};

// 状態異常処理関数
const applyhitanWhenTurnStart = async (characterList) => {
  return characterList
    .filter(
      (x) =>
        x.entity.system.attributes?.checkhitan?.value > 0 &&
        x.entity.system.attributes.stackProtection.value <= 1
    )
    .map((x) => {
      console.log(x.entity.name + "に対して悲嘆による保護付与");
      const beforeStack = x.entity.system.attributes.stackProtection.value;
      const AddStack = x.entity.system.attributes.stackProtectionnext.value;
      return x.entity.modifyTokenAttribute("attributes.stackProtection", 1);
    });
};

const applyFrenzyWhenTurnStart = async (characterList) => {
  let resultList = [];
  characterList
    .filter((x) => x.entity.system.attributes?.stackfrenzy?.value > 0)
    .forEach((x) => {
      console.log(x.entity.name + "に対して狂乱処理");
      const addStack = x.entity.system.attributes.stackfrenzy.value;
      const beforeStack = x.entity.system.attributes.stackDamageUp.value;
      const beforeVulnerable = x.entity.system.attributes.stackVulnerable.value;
      resultList.push(
        x.entity.modifyTokenAttribute(
          "attributes.stackDamageUp",
          addStack + beforeStack
        )
      );
      resultList.push(
        x.entity.modifyTokenAttribute(
          "attributes.stackVulnerable",
          addStack + beforeVulnerable
        )
      );
    });
  return resultList;
};

const applyShinsyokuWhenTurnStart = async (characterList) => {
  return characterList
    .filter((x) => x.entity.system.attributes?.stackSinsyoku?.value > 0)
    .map((x) => {
      console.log(x.entity.name + "に対して侵食によるダメージアップ処理");
      const addStack = x.entity.system.attributes.stackSinsyoku.value;
      const beforeStack = x.entity.system.attributes.stackDamageUp.value;
      console.log(
        `侵食スタック: ${addStack}, ダメージアップスタック: ${beforeStack}`
      );
      return x.entity.modifyTokenAttribute(
        "attributes.stackDamageUp",
        addStack + beforeStack
      );
    });
};

const applyWitchStart = async (characterList) => {
  return characterList
    .filter((x) => x.entity.system.attributes.stackwitch1.value > 0)
    .map((x) => {
      console.log(x.entity.name + "に対して呪詛処理");
      const beforeStack = x.entity.system.attributes.stackwitch1.value;
      const dealAmount =
        beforeStack * 0.02 * x.entity.system.attributes.hp.value;
      calcDamage(x, dealAmount);
    });
};

const applyRegenWhenTurnStart = async (characterList) => {
  return characterList
    .filter((x) => x.entity.system.attributes.stackregen.value > 0)
    .map((x) => {
      console.log(x.entity.name + "に対して再生処理");
      const beforeStack = x.entity.system.attributes.stackregen.value;
      const healAmount = beforeStack * 0.05 * x.entity.system.attributes.hp.max;
      calcHeal(x, healAmount);
      return x;
    });
};

const applyBindWhenTurnStart = async (characterList) => {
  let resultList = [];
  characterList
    .filter((x) => x.entity.system.attributes.stackbindnext.value > 0)
    .forEach((x) => {
      console.log(x.entity.name + "に対して束縛付与");
      const beforeStack = x.entity.system.attributes.stackbind.value;
      const AddStack = x.entity.system.attributes.stackbindnext.value;
      resultList.push(
        x.entity.modifyTokenAttribute(
          "attributes.stackbind",
          beforeStack + AddStack
        )
      );
      resultList.push(
        x.entity.modifyTokenAttribute("attributes.stackbindnext", 0)
      );
    });
  return resultList;
};

const applyRegenPlusWhenTurnStart = async (characterList) => {
  let resultList = [];
  characterList
    .filter((x) => x.entity.system.attributes.stackregennext.value > 0)
    .forEach((x) => {
      console.log(x.entity.name + "に対して再生付与");
      const beforeStack = x.entity.system.attributes.stackregen.value;
      const AddStack = x.entity.system.attributes.stackregennext.value;
      resultList.push(
        x.entity.modifyTokenAttribute(
          "attributes.stackregen",
          beforeStack + AddStack
        )
      );
      resultList.push(
        x.entity.modifyTokenAttribute("attributes.stackregennext", 0)
      );
    });
  return resultList;
};

const applyBleedingWhenTurnStart = async (characterList) => {
  let resultList = [];
  characterList
    .filter((x) => x.entity.system.attributes.stackBleedingnext.value > 0)
    .forEach((x) => {
      console.log(x.entity.name + "に対して出血付与");
      const beforeStack = x.entity.system.attributes.stackBleeding.value;
      const AddStack = x.entity.system.attributes.stackBleedingnext.value;
      resultList.push(
        x.entity.modifyTokenAttribute(
          "attributes.stackBleeding",
          beforeStack + AddStack
        )
      );
      resultList.push(
        x.entity.modifyTokenAttribute("attributes.stackBleedingnext", 0)
      );
    });
  return resultList;
};

const applyPoisonWhenTurnStart = async (characterList) => {
  let resultList = [];
  characterList
    .filter((x) => x.entity.system.attributes.stackPoisonnext.value > 0)
    .forEach((x) => {
      console.log(x.entity.name + "に対して毒付与");
      const beforeStack = x.entity.system.attributes.stackPoison.value;
      const AddStack = x.entity.system.attributes.stackPoisonnext.value;
      resultList.push(
        x.entity.modifyTokenAttribute(
          "attributes.stackPoison",
          beforeStack + AddStack
        )
      );
      resultList.push(
        x.entity.modifyTokenAttribute("attributes.stackPoisonnext", 0)
      );
    });
  return resultList;
};

const applyBurnedWhenTurnStart = async (characterList) => {
  let resultList = [];
  characterList
    .filter((x) => x.entity.system.attributes.stackBurnednext.value > 0)
    .forEach((x) => {
      console.log(x.entity.name + "に対してやけど付与");
      const beforeStack = x.entity.system.attributes.stackBurned.value;
      const AddStack = x.entity.system.attributes.stackBurnednext.value;

      resultList.push(
        x.entity.modifyTokenAttribute(
          "attributes.stackBurned",
          beforeStack + AddStack
        )
      );
      resultList.push(
        x.entity.modifyTokenAttribute("attributes.stackBurnednext", 0)
      );
    });
  return resultList;
};

const applyPowerUpWhenTurnStart = async (characterList) => {
  let resultList = [];
  characterList
    .filter((x) => x.entity.system.attributes.stackPowerUpnext.value > 0)
    .forEach((x) => {
      console.log(x.entity.name + "に対してパワー付与");
      const beforeStack = x.entity.system.attributes.stackPowerUp.value;
      const AddStack = x.entity.system.attributes.stackPowerUpnext.value;
      resultList.push(
        x.entity.modifyTokenAttribute(
          "attributes.stackPowerUp",
          beforeStack + AddStack
        )
      );
      resultList.push(
        x.entity.modifyTokenAttribute("attributes.stackPowerUpnext", 0)
      );
    });
  return resultList;
};

const applyProtectionWhenTurnStart = async (characterList) => {
  let resultList = [];
  characterList
    .filter((x) => x.entity.system.attributes.stackProtectionnext.value > 0)
    .map((x) => {
      console.log(x.entity.name + "に対して保護付与");
      const beforeStack = x.entity.system.attributes.stackProtection.value;
      const AddStack = x.entity.system.attributes.stackProtectionnext.value;
      resultList.push(
        x.entity.modifyTokenAttribute(
          "attributes.stackProtection",
          beforeStack + AddStack
        )
      );
      resultList.push(
        x.entity.modifyTokenAttribute("attributes.stackProtectionnext", 0)
      );
    });
  return resultList;
};

const applyDamageUpWhenTurnStart = async (characterList) => {
  let resultList = [];
  characterList
    .filter((x) => x.entity.system.attributes.stackDamageUpnext.value > 0)
    .forEach((x) => {
      console.log(x.entity.name + "に対してダメージ上昇付与");
      const beforeStack = x.entity.system.attributes.stackDamageUp.value;
      const AddStack = x.entity.system.attributes.stackDamageUpnext.value;
      resultList.push(
        x.entity.modifyTokenAttribute(
          "attributes.stackDamageUp",
          beforeStack + AddStack
        )
      );
      resultList.push(
        x.entity.modifyTokenAttribute("attributes.stackDamageUpnext", 0)
      );
    });
  return resultList;
};

const applyPowerDownWhenTurnStart = async (characterList) => {
  let resultList = [];
  characterList
    .filter((x) => x.entity.system.attributes.stackPowerDownnext.value > 0)
    .forEach((x) => {
      console.log(x.entity.name + "に対して威力減少付与");
      const beforeStack = x.entity.system.attributes.stackPowerDown.value;
      const AddStack = x.entity.system.attributes.stackPowerDownnext.value;
      resultList.push(
        x.entity.modifyTokenAttribute(
          "attributes.stackPowerDown",
          beforeStack + AddStack
        )
      );
      resultList.push(
        x.entity.modifyTokenAttribute("attributes.stackPowerDownnext", 0)
      );
    });
  return resultList;
};

const applyVulnerableWhenTurnStart = async (characterList) => {
  let resultList = [];
  characterList
    .filter((x) => x.entity.system.attributes.stackVulnerablenext.value > 0)
    .forEach((x) => {
      console.log(x.entity.name + "に対して脆弱付与");
      const beforeStack = x.entity.system.attributes.stackVulnerable.value;
      const AddStack = x.entity.system.attributes.stackVulnerablenext.value;
      resultList.push(
        x.entity.modifyTokenAttribute(
          "attributes.stackVulnerable",
          beforeStack + AddStack
        )
      );
      resultList.push(
        x.entity.modifyTokenAttribute("attributes.stackVulnerablenext", 0)
      );
    });
  return resultList;
};

const applyDamageDownWhenTurnStart = async (characterList) => {
  let resultList = [];
  characterList
    .filter((x) => x.entity.system.attributes.stackDamageDownnext.value > 0)
    .forEach((x) => {
      console.log(x.entity.name + "に対してダメージ減少付与");
      const beforeStack = x.entity.system.attributes.stackDamageDown.value;
      const AddStack = x.entity.system.attributes.stackDamageDownnext.value;
      resultList.push(
        x.entity.modifyTokenAttribute(
          "attributes.stackDamageDown",
          beforeStack + AddStack
        )
      );
      resultList.push(
        x.entity.modifyTokenAttribute("attributes.stackDamageDownnext", 0)
      );
      return x;
    });
};

const applyFearWhenTurnStart = async (characterList) => {
  let resultList = [];
  characterList
    .filter((x) => x.entity.system.attributes.stackFearnext.value > 0)
    .forEach((x) => {
      console.log(x.entity.name + "に対して恐怖付与");
      const beforeStack = x.entity.system.attributes.stackFear.value;
      const AddStack = x.entity.system.attributes.stackFearnext.value;
      resultList.push(
        x.entity.modifyTokenAttribute(
          "attributes.stackFear",
          beforeStack + AddStack
        )
      );
      resultList.push(
        x.entity.modifyTokenAttribute("attributes.stackFearnext", 0)
      );
      return x;
    });
};

const applyParalysisWhenTurnStart = async (characterList) => {
  let resultList = [];
  characterList
    .filter((x) => x.entity.system.attributes.stackParalysisnext.value > 0)
    .forEach((x) => {
      console.log(x.entity.name + "に対して麻痺付与");
      const beforeStack = x.entity.system.attributes.stackParalysis.value;
      const AddStack = x.entity.system.attributes.stackParalysisnext.value;
      resultList.push(
        x.entity.modifyTokenAttribute(
          "attributes.stackParalysis",
          beforeStack + AddStack
        )
      );
      resultList.push(
        x.entity.modifyTokenAttribute("attributes.stackParalysisnext", 0)
      );
      return x;
    });
};

const applyPoiseWhenTurnStart = async (characterList) => {
  let resultList = [];
  characterList
    .filter((x) => x.entity.system.attributes.stackpoisenext.value > 0)
    .map((x) => {
      console.log(x.entity.name + "に対して呼吸処理");
      const beforeStack = x.entity.system.attributes.stackpoise.value;
      const AddStack = x.entity.system.attributes.stackpoisenext.value;
      resultList.push(
        x.entity.modifyTokenAttribute(
          "attributes.stackpoise",
          beforeStack + AddStack
        )
      );
      resultList.push(
        x.entity.modifyTokenAttribute("attributes.stackpoisenext", 0)
      );
      return x;
    });
};

const applyTremorWhenTurnStart = async (characterList) => {
  let resultList = [];
  characterList
    .filter((x) => x.entity.system.attributes.stacktremornext.value > 0)
    .map((x) => {
      console.log(x.entity.name + "に対して振動処理");
      const beforeStack = x.entity.system.attributes.stacktremor.value;
      const AddStack = x.entity.system.attributes.stacktremornext.value;
      resultList.push(
        x.entity.modifyTokenAttribute(
          "attributes.stacktremor",
          beforeStack + AddStack
        )
      );
      resultList.push(
        x.entity.modifyTokenAttribute("attributes.stacktremornext", 0)
      );
      return x;
    });
};

const applySinkWhenTurnStart = async (characterList) => {
  let resultList = [];
  characterList
    .filter((x) => x.entity.system.attributes.stacksinknext.value > 0)
    .map((x) => {
      console.log(x.entity.name + "に対して沈潜処理");
      const beforeStack = x.entity.system.attributes.stacksink.value;
      const AddStack = x.entity.system.attributes.stacksinknext.value;
      resultList.push(
        x.entity.modifyTokenAttribute(
          "attributes.stacksink",
          beforeStack + AddStack
        )
      );
      resultList.push(
        x.entity.modifyTokenAttribute("attributes.stacksinknext", 0)
      );
      return x;
    });
};

const applyBiribiriWhenTurnStart = async (characterList) => {
  let resultList = [];
  characterList
    .filter((x) => x.entity.system.attributes.stackbiribirinext.value > 0)
    .map((x) => {
      console.log(x.entity.name + "に対して充電追加処理");
      const beforeStack = x.entity.system.attributes.stackbiribiri.value;
      const AddStack = x.entity.system.attributes.stackbiribirinext.value;
      resultList.push(
        x.entity.modifyTokenAttribute(
          "attributes.stackbiribiri",
          beforeStack + AddStack
        )
      );
      resultList.push(
        x.entity.modifyTokenAttribute("attributes.stackbiribirinext", 0)
      );
      return x;
    });
};

const applyAwakenWhenTurnStart = async (characterList) => {
  let resultList = [];
  characterList
    .filter(
      (x) =>
        x.entity.system.attributes.stackFEOAwakenNext &&
        x.entity.system.attributes.stackFEOAwakenNext.value > 0
    )
    .map((x) => {
      console.log(x.entity.name + "に対して充電追加処理");
      const beforeStack = x.entity.system.attributes.stackFEOAwaken
        ? x.entity.system.attributes.stackFEOAwaken.value
        : 0;
      const AddStack = x.entity.system.attributes.stackFEOAwakenNext.value;
      resultList.push(
        x.entity.modifyTokenAttribute(
          "attributes.stackFEOAwaken",
          beforeStack + AddStack
        )
      );
      resultList.push(
        x.entity.modifyTokenAttribute("attributes.stackFEOAwakenNext", 0)
      );
      return x;
    });
};

const applySkmodBySoraWhenTurnStart = async (characterList) => {
  // checkSoraがtrueのキャラクターがいるかを確認
  const hasSoraActivated = characterList.some(
    (x) => x.entity.system.attributes.checkSora?.value > 0
  );

  // stackSmokeGrandが30以上あるかを確認
  const hasEnoughSmock = characterList.some(
    (x) => (x.entity.system.attributes.stackSmokeGrand?.value ?? 0) >= 30
  );

  // 条件に合致する場合、isPlayerがtrueのキャラクターすべてにパワーアップを付与
  if (hasSoraActivated && hasEnoughSmock) {
    console.log("立ち込める煙による威力上昇付与処理を実行");

    const playerCharacters = characterList.filter(
      (x) => x.entity.system.attributes.isPlayer?.value === true
    );

    const resultList = [];

    playerCharacters.forEach((x) => {
      console.log(`${x.entity.name} に威力上昇+1を付与`);
      const currentPowerUp =
        x.entity.system.attributes.stackPowerUp?.value ?? 0;
      resultList.push(
        x.entity.modifyTokenAttribute(
          "attributes.stackPowerUp",
          currentPowerUp + 1
        )
      );
      x.messages.push(`濃密な煙が立ち込めている。`);
    });

    return resultList;
  }

  return [];
};

const resetDarkFireWhenTurnStart = async (characterList) => {
  let resetPromises = [];
  characterList.forEach((x) => {
    console.log(`${x.entity.name} の黒炎をリセット`);
    x.stackDarkFire = 0; // ローカル変数もリセット
    resetPromises.push(
      x.entity.modifyTokenAttribute("attributes.stackDarkFire", 0)
    );
  });
  return Promise.all(resetPromises);
};

const applyDamage = (character, damage) => {
  let hp = character.hp;
  let barrier = character.barrier;

  if (barrier > 0) {
    const absorbed = Math.min(barrier, damage);
    barrier -= absorbed;
    damage -= absorbed;
  }
  if (damage > 0) {
    hp -= damage;
  }

  // HPとバリアの反映
  character.entity.modifyTokenAttribute("attributes.hp", hp);
  character.entity.modifyTokenAttribute("attributes.barrier", barrier);

  return character;
};

// メイン関数の呼び出し
main();

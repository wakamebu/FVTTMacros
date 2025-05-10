// scripts/csv-importer.js
//　コアも作りたい
const artsGroup = {
  //作成したワールドごとに割り振られるidが変わるため、テスト環境でのidを記載。コメントアウト部分に本番環境でのidを記載
  id: "Jqp2I6vuHrNh0J6M",
  //id: 'YbBU6tUS9qMpugTj',
  name: "ArtsGroup",
  ikey: "artsgroup",
};

const shopGroup = {
  id: "ezqdIwTCBeczrJ6r",
  //id : 'JMrXLRlNGVjvg4Bj',
  name: "Shop group (Arts)",
  ikey: "shopgrouparts",
};

const passiveGroup = {
  //id : 'ZcMsF9VhlkEpO0cK',
  id: "CRCPCSlVVxMAVSYm",
  name: "Passive Group",
  ikey: "geargroup",
};

/*//
    const plusap = {
        attribute : 'ap',
        citem : "t1pQ37eYRDkNQt6e",
        listmod : "INCLUDE",
        name : "add ap",
        type : "ADD",
        value : 1,
    };
    //*/

Hooks.once("init", () => {
  console.log("CSV Importer モジュールが読み込まれました。");
});

function openCSVImportDialog() {
  new Dialog({
    title: "CSV ファイルのインポート",
    content: `
            <form>
            <div class="form-group">
                <label>CSV ファイルを選択:</label>
                <input type="file" id="csv-file-input" accept=".csv" />
            </div>
            <div class="form-group">
            <label>インポート対象を選択:</label>
            <select id="import-type">
                <option value="arts">アーツ</option>
                <option value="chara">キャラ</option>
                <option value="passive">パッシブ</option>
            </select>
            </div>
        </form>
        `,
    buttons: {
      import: {
        label: "インポート",
        callback: (html) => {
          const fileInput = html.find("#csv-file-input")[0];
          const importType = html.find("#import-type").val();
          if (fileInput.files.length === 0) {
            ui.notifications.error("ファイルが選択されていません。");
            return;
          }
          const file = fileInput.files[0];
          readCSVFile(file, importType);
        },
      },
      cancel: {
        label: "キャンセル",
      },
    },
    default: "import",
  }).render(true);
}

//CSVの読み込み関数
function readCSVFile(file, importType) {
  const reader = new FileReader();
  reader.onload = (event) => {
    let csvData = event.target.result;

    if (csvData.charCodeAt(0) === 0xfeff) {
      // BOMがある場合は削除
      csvData = csvData.slice(1);
    }

    Papa.parse(csvData, {
      header: true,
      complete: (results) => {
        console.log("csvデータ:", results.data);
        ui.notifications.info("csvデータをコンソールに表示しました");

        if (importType === "arts") {
          createActorsFromCSVData(results.data, importType);
          createItemsFromCSVData(results.data);
        } else if (importType === "chara") {
          createActorsFromCSVData(results.data, importType);
        } else if (importType === "passive") {
          createItemsFromCSVDataPassive(results.data);
          createActorsFromCSVData(results.data, importType);
        }
      },
      error: (error) => {
        console.error("エラー:", error);
        ui.notifications.info("csvの読込中にエラーが発生しました");
      },
    });
  };
  reader.readAsText(file);
}

//CSVからFVTTのアクターデータに変換する関数
//EnemyActorData
function mapCSVDataToActorDataCharacter(csvDataRow) {
  //ここに記載されていないデータはReload Templateボタンを押すことでテンプレートの初期値で設定される。
  return {
    name: csvDataRow.name,
    type: "character",
    img: "icons/Arts/SwordsArtsIcons.png", //好きな画像を指定

    prototypeToken: {
      actorLink: true, // CharなのでTrue
      disposition: -1, // Enemyなので-1
      bar1: {
        attribute: "attributes.hp",
      },
      bar2: {
        attribute: "attributes.constitution",
      },
    },

    system: {
      attributes: {
        level: {
          value: parseInt(csvDataRow.level) || 0,
          max: parseInt(csvDataRow.level_max) || 0,
        },
        hp: {
          value: parseInt(csvDataRow.hp) || 0,
          max: parseInt(csvDataRow.hp_max) || 0,
        },
        constitution: {
          value: parseInt(csvDataRow.constitution) || 0,
          max: parseInt(csvDataRow.constitution_max) || 0,
        },
        mp: {
          value: parseInt(csvDataRow.mp) || 0,
          max: parseInt(csvDataRow.mp_max) || 0,
        },
        san: {
          value: parseInt(csvDataRow.san) || 0,
          max: parseInt(csvDataRow.san_max) || 0,
        },
      },

      gtemplate: csvDataRow.gtemplate,
    },
  };
}

function mapCSVDataToActorDataArts(csvDataRow) {
  const attributes = {
    maxuses: {
      value: csvDataRow.maxuses || "",
    },
    skilldamage: {
      value: csvDataRow.skilldamage || "",
    },
    damagetype: {
      value: csvDataRow.damagetype || "",
    },
    speed: {
      value: csvDataRow.speed || "",
    },
    describe: {
      value: csvDataRow.effect || "",
    },
  };

  const description = generateDescriptionArts(attributes);
  console.log(description + "を生成しました");

  return {
    name: csvDataRow.name,
    type: "character",
    img: "icons/Arts/SwordsArtsIcons.png",
    prototypeToken: {
      actorLink: true, // ActorなのでTrue
      disposition: 0, // Objectなので0
      texture: {
        src: "icons/Arts/SwordsArtsIcons.png",
      },
    },

    system: {
      biovisible: false,
      description: description,
      prototypeToken: {
        texture: {
          src: "icons/Arts/SwordsArtsIcons.png",
        },
      },
      attributes: {
        Arts_description: {
          autoadd: 0,
          default: false,
          isset: false,
          maxadd: 0,
          maxblocked: false,
          maxexec: false,
          modified: false,
          modmax: false,
          value: description,
        },
      },
      gtemplate: csvDataRow.gtemplate,
    },
  };
}

function mapCSVDataToActorDataPassive(csvDataRow) {
  const attributes = {
    describe: {
      value: csvDataRow.effect || "",
    },
  };

  const description = generateDescriptionArts(attributes);
  console.log(description + "を生成しました");

  return {
    name: csvDataRow.name,
    type: "character",
    img: "icons/PassiveIcon2.png",
    prototypeToken: {
      actorLink: true, // ActorなのでTrue
      disposition: 0, // Objectなので0
      texture: {
        src: "icons/PassiveIcon2.png",
      },
    },

    system: {
      biovisible: false,
      description: description,
      attributes: {
        Arts_description: {
          autoadd: 0,
          default: false,
          isset: false,
          maxadd: 0,
          maxblocked: false,
          maxexec: false,
          modified: false,
          modmax: false,
          value: description,
        },
      },
      gtemplate: csvDataRow.gtemplate,
    },
  };
}

//CSVからFVTTのアイテムデータに変換する関数
// Arts
function mapCSVDataToItemData(csvDataRow) {
  const attributes = {
    name: {
      value: csvDataRow.name || "",
    },
    maxuses: {
      value: csvDataRow.maxuses || "",
    },
    skilldamage: {
      value: csvDataRow.skilldamage || "",
    },
    damagetype: {
      value: csvDataRow.damagetype || "",
    },
    speed: {
      value: csvDataRow.speed || "",
    },
    describe: {
      value: csvDataRow.effect || "",
    },
    costpoint: {
      value: parseInt(csvDataRow.costpoint) || 1,
    },
    Price: {
      value: parseInt(csvDataRow.price) || 0,
    },
  };

  const description = generateDescription(attributes);
  return {
    name: csvDataRow.name,
    type: "cItem",
    //img: 'icons/Arts/SwordsArtsIcons.png', //好きな画像を指定、もしくはcsvで指定、もしくは@{sdb}などを読み取って自動で振り分け
    system: {
      description: description,
      roll: "#{skilldamage} + #{damagetype} + @{skmod}",
      rollname: csvDataRow.name,
      maxuses: parseInt(csvDataRow.maxuses) || 0,
      usetype: "CON",
      groups: [artsGroup, shopGroup],
      icon: "fa-sword",
      rechargable: true,
      attributes: {
        name: csvDataRow.name,
        costpoint: {
          value: parseInt(csvDataRow.costpoint) || 1,
          ishidden: false,
        },
        skilldamage: {
          value: csvDataRow.skilldamage,
          ishidden: false,
        },
        speed: {
          value: csvDataRow.speed,
          ishidden: false,
        },
        damagetype: {
          value: csvDataRow.damagetype || 0,
          ishidden: false,
        },
        Price: {
          value: parseInt(csvDataRow.price) || 0,
          ishidden: false,
        },
        describe: {
          value: csvDataRow.effect,
          ishidden: false,
        },
        damageroll: {
          value: "",
          ishidden: false,
        },
      },
    },
  };
}

//Passive
function mapCSVDataToItemDataPassive(csvDataRow) {
  return {
    name: csvDataRow.name,
    type: "cItem",
    system: {
      description: csvDataRow.effect,
      rollname: csvDataRow.name,
      usetype: "ACT",
      groups: [passiveGroup],
      attributes: {
        name: csvDataRow.name,
        cost: {
          value: parseInt(csvDataRow.costpoint) || 0,
          ishidden: false,
        },
        corepassive: {
          value: csvDataRow.effect,
          ishidden: false,
        },
      },
    },
  };
}

//Actor作成
function createActorsFromCSVData(csvDataArray, importType) {
  csvDataArray.forEach((csvDataRow) => {
    if (!csvDataRow.name) {
      ui.notifications.warn("名前のない行があります。スキップします。");
      return;
    }
    if (importType === "chara") {
      const actorData = mapCSVDataToActorDataCharacter(csvDataRow);
      Actor.create(actorData)
        .then((actor) => {
          console.log("アクター「${actor.name}」を作成しました");
        })
        .catch((error) => {
          console.error("アクター作成中にエラーが発生しました", error);
          ui.notifications.error(
            "アクター「${actor.name}」の作成に失敗しました"
          );
        });
    } else if (importType === "arts") {
      const actorData = mapCSVDataToActorDataArts(csvDataRow);
      Actor.create(actorData)
        .then((actor) => {
          console.log("アーツアクター「${actor.name}」を作成しました");
        })
        .catch((error) => {
          console.error("アクター作成中にエラーが発生しました", error);
          ui.notifications.error(
            "アクター「${actor.name}」の作成に失敗しました"
          );
        });
    } else if (importType === "passive") {
      const actorData = mapCSVDataToActorDataPassive(csvDataRow);
      Actor.create(actorData)
        .then((actor) => {
          console.log("パッシブアクター「${actor.name}」を作成しました");
        })
        .catch((error) => {
          console.error("アクター作成中にエラーが発生しました", error);
          ui.notifications.error(
            "アクター「${actor.name}」の作成に失敗しました"
          );
        });
    }
  });
}

//Item作成
function createItemsFromCSVData(csvDataArray) {
  csvDataArray.forEach((csvDataRow) => {
    if (!csvDataRow.name) {
      ui.notifications.warn("名前のない行があります。スキップします。");
      return;
    }
    const itemData = mapCSVDataToItemData(csvDataRow);
    Item.create(itemData)
      .then((items) => {
        console.log("cItem「$item.name」を作成しました");
      })
      .catch((error) => {
        console.error("cItem作成中にエラーが発生しました", error);
        ui.notifications.error("cItem「$item.name」の作成に失敗しました");
      });
  });
}

function createItemsFromCSVDataPassive(csvDataArray) {
  csvDataArray.forEach((csvDataRow) => {
    if (!csvDataRow.name) {
      ui.notifications.warn("名前のない行があります。スキップします。");
      return;
    }
    const itemData = mapCSVDataToItemDataPassive(csvDataRow);
    Item.create(itemData)
      .then((items) => {
        console.log("cItem「$item.name」を作成しました");
      })
      .catch((error) => {
        console.error("cItem作成中にエラーが発生しました", error);
        ui.notifications.error("cItem「$item.name」の作成に失敗しました");
      });
  });
}

//describe作成
function generateDescription(attributes) {
  const lines = [];
  // 使用回数
  if (attributes.maxuses && attributes.maxuses.value) {
    lines.push("<p>" + `使用回数：${attributes.maxuses.value}`);
  }

  // 威力
  if (attributes.skilldamage && attributes.skilldamage.value) {
    lines.push(`威力：${attributes.skilldamage.value}`);
  }

  // ダメージタイプ
  if (attributes.damagetype && attributes.damagetype.value) {
    lines.push(`ダメージタイプ：${attributes.damagetype.value}`);
  }

  // 速度
  if (attributes.speed && attributes.speed.value) {
    lines.push(`速度：${attributes.speed.value}`);
  }

  // 効果
  if (attributes.describe && attributes.describe.value) {
    lines.push(`効果：${attributes.describe.value}`);
  }

  // 行を結合して説明文を生成
  return lines.join("<br>");
}

function generateDescriptionArts(attributes) {
  const lines = [];
  // 使用回数
  if (attributes.maxuses && attributes.maxuses.value) {
    lines.push(`使用回数：${attributes.maxuses.value}`);
  }

  // 威力
  if (attributes.skilldamage && attributes.skilldamage.value) {
    lines.push(`威力：${attributes.skilldamage.value}`);
  }

  // ダメージタイプ
  if (attributes.damagetype && attributes.damagetype.value) {
    lines.push(`ダメージタイプ：${attributes.damagetype.value}`);
  }

  // 速度
  if (attributes.speed && attributes.speed.value) {
    lines.push(`速度：${attributes.speed.value}`);
  }

  // 効果
  if (attributes.describe && attributes.describe.value) {
    lines.push(`効果：${attributes.describe.value}`);
  }

  // 行を結合して説明文を生成
  return lines.join("\n");
}

// モジュールが準備完了になったら関数を登録
Hooks.once("ready", () => {
  game.modules.get("csv-importer").openCSVImportDialog = openCSVImportDialog;
});

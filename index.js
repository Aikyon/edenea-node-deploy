import express from "express";
import pg from "pg";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import env from "dotenv";
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';



const app = express();
const port = process.env.PORT || 10000;
const saltRounds = 10;
env.config();

/*const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
  ssl: {
    rejectUnauthorized: false,  // RenderのSSL接続に必要
  },
});*/

const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

db.connect();

// ESモジュール用の__dirnameの設定
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ミドルウェアの設定
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 静的ファイルの提供（publicフォルダ）
app.use(express.static(path.join(__dirname, 'public')));

// CORSの設定
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});


app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,  // 1日
  },
}));

app.use(passport.initialize());
app.use(passport.session());


// mainページ
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'index.html'));
});

// aboutページ
app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'about.html'));
});

// newsページ
app.get('/news', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'news.html'));
});

app.get('/news-end-products', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'news-end-products.html'));
});

app.get('/news-handcare', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'news-handcare.html'));
});

app.get('/news-new-item', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'news-new-item.html'));
});

app.get('/news-official-site', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'news-official-site.html'));
});

app.get('/news-summer-holiday', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'news-summer-holiday.html'));
});

// 規約ページ
app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'privacy.html'));
});

app.get('/sctl', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'sctl.html'));
});

app.get('/TOS', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'TOS.html'));
});



// GETリクエストのルートを追加
app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html','contact.html')); // contact.htmlを返す
});



// ルート
app.get("/home", (req, res) => {
  res.render("home.ejs");
});

// ログインページ
app.get("/login", (req, res) => {
  res.render("login.ejs");
});

// 登録ページ
app.get("/register", (req, res) => {
  res.render("register.ejs");
});

// マイページ
app.get("/mypage", (req, res) => {
  if (req.isAuthenticated()) {
    //console.log(req.user); // ユーザーオブジェクト全体をログに出力
    res.render("mypage.ejs", { user: req.user });
  } else {
    res.redirect("/login");
  }
});

// Google OAuth 認証
app.get("/auth/google", passport.authenticate("google", {
  scope: ["profile", "email"],
}));

app.get("/auth/google/mypage", passport.authenticate("google", {
  successRedirect: "/mypage",
  failureRedirect: "/login",
}));

// 商品一覧ページのルート
app.get("/product", async (req, res) => {
  try {
    // 商品一覧をデータベースから取得
    const products = await db.query("SELECT * FROM products");

    // 各商品の価格をカンマ付きにフォーマット
    products.rows.forEach(product => {
      // 価格が存在する場合のみフォーマット
      if (product.price !== null) {
        product.formattedPrice = Number(product.price).toLocaleString();
      } else {
        product.formattedPrice = '価格未設定'; // 価格が設定されていない場合の表示
      }
    });
        // 商品一覧を表示するテンプレートをレンダリング
    res.render("product.ejs", { products: products.rows });
  } catch (err) {
    console.error("商品一覧の表示中にエラーが発生しました:", err);
    res.status(500).send("商品一覧の表示中にエラーが発生しました");
  }
});


app.get("/cart", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.render("login.ejs");  
  }

  const userId = req.user.id;

  try {
    const cartItems = await db.query(
      `SELECT p.name, p.price, c.quantity, p.image_path, c.product_id
       FROM cart c
       JOIN products p ON c.product_id = p.product_id
       WHERE c.user_id = $1`, [userId]);

    let totalQuantity = 0;
    let totalPrice = 0;

    cartItems.rows.forEach(item => {
      totalQuantity += item.quantity;
      totalPrice += item.quantity * item.price;

      // 価格を数値に変換し、カンマ付きにフォーマット
      const priceAsNumber = parseFloat(item.price);
      if (!isNaN(priceAsNumber)) {
        item.formattedPrice = priceAsNumber.toLocaleString();
      } else {
        console.error(`Invalid price for item ${item.product_id}: ${item.price}`);
        item.formattedPrice = item.price; // フォールバック
      }
    });

    // 合計金額もカンマ付きにフォーマット
    const formattedTotalPrice = totalPrice.toLocaleString();

    return res.render("cart.ejs", {
      cartItems: cartItems.rows,
      totalQuantity: totalQuantity,
      totalPrice: formattedTotalPrice
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send("カートの表示中にエラーが発生しました");
  }
});

// 購入完了ページのルート
app.get("/checkout", (req, res) => {
  // 購入完了ページを表示
  res.render("checkout.ejs"); // checkout-success.ejsをレンダリング
});



// ログアウト
app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) console.log(err);
    res.redirect("/home");
  });
});

// ローカルログイン処理
app.post("/login", 
  passport.authenticate("local", {
    successRedirect: "/mypage",
    failureRedirect: "/login",
  })
);

// ユーザー登録処理
app.post("/register", async (req, res) => {
  const lastName = req.body.lastName;
  const firstName = req.body.firstName;
  const birthdate = req.body.birthdate;
  const gender = req.body.gender;
  const postal_code = req.body.postal_code;
  const prefecture = req.body.prefecture;
  const address = req.body.address;
  const phone_number = req.body.phone_number;
  const email = req.body.username;
  const password = req.body.password;

  try {
    // メールアドレスの重複確認
    const checkResult = await db.query("SELECT * FROM customers WHERE email = $1", [email]);

    if (checkResult.rows.length > 0) {
      return res.status(409).send("このアドレスは既に登録済みです");
    } else {
      // パスワードのハッシュ化
      const hash = await bcrypt.hash(password, saltRounds);
      const name = `${lastName} ${firstName}`;  // フルネームの作成

      // データベースにユーザー情報を保存
      await db.query(
        `INSERT INTO customers (name, birthdate, gender, email, password, postal_code, prefecture, address, phone_number) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [name, birthdate, gender, email, hash, postal_code, prefecture, address, phone_number]
      );

      res.render("secrets.ejs");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("エラーが発生しました。もう一度やり直して下さい");
  }
});


// カートに商品を追加
app.post("/cart", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.render("login.ejs");
  }

  const userId = req.user.id;
  const { productId: productIdString, quantity } = req.body;
  const productId = parseInt(productIdString, 10);

  try {
    const product = await db.query("SELECT * FROM products WHERE product_id = $1", [productId]);

    if (product.rows.length === 0) {
      return res.status(404).send("商品が見つかりません");
    }

    const existingItem = await db.query(
      "SELECT * FROM cart WHERE user_id = $1 AND product_id = $2", 
      [userId, productId]
    );

    if (existingItem.rows.length > 0) {
      await db.query(
        "UPDATE cart SET quantity = quantity + $1 WHERE user_id = $2 AND product_id = $3", 
        [quantity, userId, productId]
      );
    } else {
      await db.query(
        "INSERT INTO cart (user_id, product_id, quantity) VALUES ($1, $2, $3)", 
        [userId, productId, quantity]
      );
    }

    return res.redirect("/cart");  // カートページへリダイレクト
  } catch (err) {
    console.error(err);
    return res.status(500).send("カート追加中にエラーが発生しました");
  }
});

// カートのアイテム削除
app.post('/cart/delete', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.render("login.ejs");
  }

  const userId = req.user.id;
  const itemIdString = req.body.itemId;
  console.log("Received itemId:", itemIdString); // 追加： itemIdのログ出力
  const itemId = parseInt(itemIdString, 10);

  // itemIdのバリデーション
  if (isNaN(itemId) || itemId <= 0) {
    console.log("Invalid itemId:", itemIdString); // 追加：無効なitemIdのログ出力
    return res.status(400).send('無効なアイテムIDです。');
  }

  try {
    const result = await db.query("DELETE FROM cart WHERE user_id = $1 AND product_id = $2", [userId, itemId]);
    if (result.rowCount === 0) {
      return res.status(404).send('指定されたアイテムは見つかりませんでした。');
    }
    res.redirect('/cart');
  } catch (err) {
    console.error("Delete error:", err);
    return res.status(500).send('アイテムの削除中にエラーが発生しました');
  }
});

// カートの数量を更新するルート
app.post('/cart/update-quantity', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.render("login.ejs");
  }

  const userId = req.user.id;
  const itemIdString = req.body.itemId;
  const newQuantityString = req.body.quantity;
  const itemId = parseInt(itemIdString, 10);
  const newQuantity = parseInt(newQuantityString, 10);

  // バリデーション: itemIdとquantityが正しいか確認
  if (isNaN(itemId) || isNaN(newQuantity) || newQuantity <= 0) {
    return res.status(400).send('無効なアイテムIDまたは数量です。');
  }

  try {
    await db.query(
      "UPDATE cart SET quantity = $1 WHERE user_id = $2 AND product_id = $3",
      [newQuantity, userId, itemId]
    );
    res.redirect('/cart');
  } catch (err) {
    console.error("Update quantity error:", err);
    return res.status(500).send('数量の更新中にエラーが発生しました');
  }
});




// ローカルストラテジーの設定
passport.use("local", new Strategy(async function verify(username, password, cb) {
  try {
    // ユーザーを取得するクエリに `id` を追加
    const result = await db.query("SELECT id, name, password FROM customers WHERE email = $1", [username]);
    
    if (result.rows.length > 0) {
      const user = result.rows[0]; // ユーザーオブジェクトを取得

      // パスワードの照合
      const storedHashedPassword = user.password;
      bcrypt.compare(password, storedHashedPassword, (err, isMatch) => {
        if (err) {
          return cb(err);
        } else if (isMatch) {
          return cb(null, user);  // ログイン成功
        } else {
          return cb(null, false);  // パスワード不一致
        }
      });
    } else {
      return cb(null, false);  // ユーザーが見つからない
    }
  } catch (err) {
    return cb(err);  // エラーハンドリング
  }
}));


// Google OAuth ストラテジーの設定
passport.use("google", new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/mypage",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
}, async (accessToken, refreshToken, profile, cb) => {
  try {
    const email = profile.emails[0].value;
    const name = profile.displayName;

    const result = await db.query("SELECT * FROM customers WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      const newUser = await db.query(
        "INSERT INTO customers (name, email, password) VALUES ($1, $2, $3)",
        [name, email, "google"]
      );
      cb(null, newUser.rows[0]);
    } else {
      cb(null, result.rows[0]);
    }
  } catch (err) {
    cb(err);
  }
}));

// セッションのシリアライズとデシリアライズ
// ログインユーザーのIDをセッションに保存

passport.serializeUser((user, cb) => {
  if (!user.id) {
    console.error("User ID is missing:", user); // IDが欠けている場合のログ
    return cb(new Error("User ID is missing")); // エラーを返す
  }
  cb(null, user.id);
});


// セッションからユーザーを取得する
passport.deserializeUser(async (id, cb) => {
  try {
    const result = await db.query("SELECT * FROM customers WHERE id = $1", [id]);
    if (result.rows.length > 0) {
      cb(null, result.rows[0]); // ユーザー情報を返す
    } else {
      cb(null, false); // ユーザーが見つからない場合
    }
  } catch (err) {
    cb(err); // エラーが発生した場合
  }
});


// フォームデータを受け取るPOSTルート
app.post('/contact', (req, res) => {
  const { name, furigana, gender, email, phone, inquiry } = req.body;

  // Nodemailerの設定
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: email,
    to: process.env.EMAIL_USER,
    subject: '新しいお問い合わせ',
    text: `
      名前: ${name}
      フリガナ: ${furigana}
      性別: ${gender ? (gender === 'male' ? '男性' : '女性') : '未選択'}
      メールアドレス: ${email}
      電話番号: ${phone}
      お問い合わせ内容: ${inquiry}
    `,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
      res.status(500).send('エラーが発生しました');
    } else {
      console.log('メール送信成功: ' + info.response);
      res.sendFile(path.join(__dirname, 'public', 'html', 'sent-message.html'));
    }
  });
});



// サーバー起動
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

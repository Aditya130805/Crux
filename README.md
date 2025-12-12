# Crux - The Professional Graph Platform

Transform your professional identity into an interactive knowledge graph. Connect your projects, skills, and experience in a way that tells your story.

## 🚀 Features

- **Interactive Graph Visualization** - Cytoscape.js-powered graphs with zoom, pan, and node interactions
- **GitHub Integration** - Automatically import repositories and infer skills
- **AI-Powered Summaries** - GPT-4 generates intelligent professional narratives
- **Public Profiles** - Shareable URLs for your professional graph (e.g., `crux.io/username`)
- **Modern UI** - Bond-inspired design with Framer Motion animations

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** - Styling
- **Cytoscape.js** - Graph visualization
- **Framer Motion** - Animations
- **Radix UI** - Accessible components
- **Axios & SWR** - Data fetching

### Backend
- **FastAPI** (Python 3.11+)
- **PostgreSQL** - User authentication & metadata
- **Redis** - Caching (optional)
- **OpenAI GPT-4** - AI summarization
- **GitHub API** - Repository integration

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- PostgreSQL
- Redis (optional, for caching)

### Backend Setup

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Create virtual environment:**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

4. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your credentials
```

Required environment variables:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/crux
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
OPENAI_API_KEY=your-openai-api-key
```

5. **Run the server:**
```bash
python main.py
# Or with uvicorn:
uvicorn main:app --reload
```

Backend will run on `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory:**
```bash
cd frontend
```

2. **Install dependencies:**
```bash
# Install packages one by one to avoid conflicts
npm install lucide-react@latest framer-motion@latest
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-label @radix-ui/react-slot @radix-ui/react-tabs @radix-ui/react-toast
npm install cytoscape cytoscape-cose-bilkent
npm install clsx tailwind-merge class-variance-authority
npm install axios swr zod
npm install next-auth@beta
npm install -D @types/cytoscape
```

3. **Create environment file:**
```bash
# Create .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

4. **Run development server:**
```bash
npm run dev
```

Frontend will run on `http://localhost:3000`

## 🗄️ Database Setup

### PostgreSQL

1. Create database:
```sql
CREATE DATABASE crux;
```

2. Tables will be created automatically by SQLAlchemy on first run.

### Redis (Optional)

1. Install Redis:
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu
sudo apt-get install redis-server
sudo systemctl start redis
```

## 🔑 GitHub OAuth Setup

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create a new OAuth App:
   - **Application name:** Crux
   - **Homepage URL:** `http://localhost:3000`
   - **Authorization callback URL:** `http://localhost:3000/api/auth/callback/github`
3. Copy Client ID and Client Secret to your `.env` files

## 🤖 OpenAI API Setup

1. Get API key from https://platform.openai.com/api-keys
2. Add to backend `.env`:
```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
```

## 📖 API Documentation

Once the backend is running, visit:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### Key Endpoints

#### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

#### Graph
- `GET /api/users/{username}/graph` - Get user's graph
- `POST /api/users/{username}/projects` - Add project
- `POST /api/users/{username}/skills` - Add skill
- `POST /api/users/{username}/experience` - Add experience

#### Integrations
- `GET /api/integrations/github/authorize` - Get GitHub OAuth URL
- `POST /api/integrations/github/sync` - Sync GitHub repos

#### AI
- `POST /api/users/{username}/summarize` - Generate AI summary
- `GET /api/users/{username}/summary` - Get existing summary

## 🎨 Design Philosophy

Crux is inspired by [Bond](https://bondapp.io) with a focus on:
- **Clean, modern aesthetic** - Dark theme with indigo/purple accents
- **Data-forward design** - Graph visualization as the centerpiece
- **Smooth animations** - Framer Motion for delightful interactions
- **Accessibility** - Radix UI for keyboard navigation and screen readers

## 🚢 Deployment

### Frontend (Vercel)

1. Push code to GitHub
2. Import project in Vercel
3. Set environment variables:
   - `NEXT_PUBLIC_API_URL=https://your-backend-url.com`
4. Deploy

### Backend (Railway/Render)

1. Create new project
2. Connect GitHub repository
3. Set environment variables
4. Deploy

### Databases

- **PostgreSQL:** Use Supabase or Railway
- **Redis:** Use Upstash or Railway (optional)

## 📝 Usage

1. **Sign up** at `/signup`
2. **Connect GitHub** to import repositories automatically
3. **Add manual data** - projects, skills, experience
4. **Generate AI summary** to create your professional narrative
5. **Share your profile** at `crux.io/username`

## 🤝 Contributing

This is an MVP. Contributions welcome!

## 📄 License

MIT

## 🔗 Links

- [Product Spec](./PRODUCT_SPEC.md)
- [Bond Design Inspiration](https://bondapp.io)

---

Built with ❤️ for professionals who think in networks.

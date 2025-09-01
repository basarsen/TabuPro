import { BrowserRouter as Router, Routes, Route } from 'react-router'
import App from '@/App';
import { Home, Room, SignIn, SignUp } from '@/pages'

const AppRoutes = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/sign-in" element={<SignIn />} />
                <Route path="/sign-up" element={<SignUp />} />
                <Route path="play" element={<App />}>
                    <Route path="r/:id" element={<Room />} />
                </Route>
            </Routes>
        </Router>
    )
}

export default AppRoutes
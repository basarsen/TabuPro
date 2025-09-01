import { BrowserRouter as Router, Routes, Route } from 'react-router'
import { Home, Room, SignIn, SignUp } from '@/pages'
import { Gate } from '@/components';
import CreateRoom from '@/pages/CreateRoom';

const AppRoutes = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/sign-in" element={<SignIn />} />
                <Route path="/sign-up" element={<SignUp />} />
                <Route element={<Gate />}>
                    <Route path="/rooms/new" element={<CreateRoom />} />
                    <Route path="/room/:code" element={<Room />} />
                </Route>
            </Routes>
        </Router>
    )
}

export default AppRoutes
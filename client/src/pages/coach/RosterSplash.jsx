import { useState, useEffect, useRef } from 'react';
import { AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../../components/Avatar';
import '../../styles/splash.css';

const RosterSplash = () => {
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
    const [bubbles, setBubbles] = useState([]);
    const containerRef = useRef(null);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch('/api/students/roster', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('获取学生数据失败');
            }

            const responseData = await response.json();
            const rawData = responseData.data;

            // Extract all students from grade groups
            const allStudents = [];
            if (rawData && rawData.gradeGroups) {
                rawData.gradeGroups.forEach(gradeGroup => {
                    if (gradeGroup.students && gradeGroup.students.length > 0) {
                        gradeGroup.students.forEach(student => {
                            allStudents.push({
                                ...student,
                                gradeName: gradeGroup.gradeName
                            });
                        });
                    }
                });
            }

            console.log('Loaded students:', allStudents.length);
            setStudents(allStudents);
        } catch (err) {
            console.error('Error fetching students:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Simple bubble creation - much simpler approach
    const createBubble = (student, index) => {
        const containerWidth = containerRef.current?.clientWidth || window.innerWidth;
        const containerHeight = containerRef.current?.clientHeight || window.innerHeight;

        return {
            id: `bubble-${index}-${Date.now()}`,
            student,
            x: Math.random() * (containerWidth - 150) + 75,
            y: Math.random() * (containerHeight - 200) + 100,
            size: 100 + Math.random() * 40,
            color: `hsl(${Math.random() * 360}, 70%, 80%)`,
            opacity: 0.9,
            createdAt: Date.now()
        };
    };

    // Add new bubbles periodically
    useEffect(() => {
        if (students.length === 0) return;

        const interval = setInterval(() => {
            const student = students[currentStudentIndex % students.length];
            const newBubble = createBubble(student, currentStudentIndex);

            console.log('Adding bubble for:', student.name);

            setBubbles(prev => {
                // Keep only the last 8 bubbles to avoid too many on screen
                const updated = [...prev, newBubble].slice(-8);
                return updated;
            });

            setCurrentStudentIndex(prev => prev + 1);
        }, 1500); // Add a new bubble every 1.5 seconds

        return () => clearInterval(interval);
    }, [students, currentStudentIndex]);

    // Remove old bubbles
    useEffect(() => {
        const cleanup = setInterval(() => {
            setBubbles(prev => {
                const now = Date.now();
                return prev.filter(bubble => now - bubble.createdAt < 10000); // Remove after 10 seconds
            });
        }, 1000);

        return () => clearInterval(cleanup);
    }, []);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (event) => {
            if (event.key === 'Escape') {
                navigate('/coach/roster');
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [navigate]);

    useEffect(() => {
        fetchStudents();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-lg text-gray-600">加载学生数据中...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-lg text-red-600 mb-4">加载失败</p>
                    <p className="text-gray-600">{error}</p>
                    <button
                        onClick={fetchStudents}
                        className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        重试
                    </button>
                </div>
            </div>
        );
    }

    if (students.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center">
                <div className="text-center text-white">
                    <h1 className="text-4xl font-bold mb-4">队员风采展示</h1>
                    <p className="text-xl">没有找到学生数据</p>
                    <button
                        onClick={() => navigate('/coach/roster')}
                        className="mt-4 px-6 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors"
                    >
                        返回名册
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 animated-gradient overflow-hidden"
            style={{ zIndex: 1000 }}
        >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:50px_50px]"></div>
            </div>

            {/* Back Button */}
            <div className="absolute top-4 left-4 z-20">
                <button
                    onClick={() => navigate('/coach/roster')}
                    className="flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-lg transition-all duration-200 border border-white/30"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    返回名册
                </button>
            </div>

            {/* Title */}
            <div className="absolute top-8 left-0 right-0 text-center z-10">
                <h1 className="text-4xl md:text-6xl font-bold text-white mb-2 drop-shadow-lg">
                    队员风采展示
                </h1>
                <p className="text-lg md:text-xl text-white/90 drop-shadow">
                    {students.length} 位队员
                </p>
            </div>

            {/* Debug Info */}
            <div className="absolute top-20 right-4 z-20 text-white text-sm bg-black/50 p-2 rounded">
                <p>Students: {students.length}</p>
                <p>Bubbles: {bubbles.length}</p>
                <p>Current: {currentStudentIndex}</p>
            </div>

            {/* Simple Bubbles */}
            {bubbles.map((bubble) => (
                <div
                    key={bubble.id}
                    className="absolute pointer-events-none animate-pulse"
                    style={{
                        left: `${bubble.x}px`,
                        top: `${bubble.y}px`,
                        width: `${bubble.size}px`,
                        height: `${bubble.size}px`,
                        opacity: bubble.opacity,
                        zIndex: 5,
                        transition: 'all 0.5s ease-in-out'
                    }}
                >
                    {/* Bubble Background */}
                    <div
                        className="absolute inset-0 backdrop-blur-sm rounded-full shadow-xl"
                        style={{
                            background: `linear-gradient(135deg, ${bubble.color}60, rgba(255,255,255,0.4))`,
                            boxShadow: `0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.6)`
                        }}
                    ></div>

                    {/* Student Content */}
                    <div className="relative w-full h-full flex flex-col items-center justify-center p-3">
                        {/* Avatar */}
                        <div className="relative mb-2">
                            <Avatar
                                src={bubble.student.avatar}
                                alt={bubble.student.name}
                                size="lg"
                                fallbackText={bubble.student.name}
                                className="ring-2 ring-white/60 shadow-lg"
                            />
                        </div>

                        {/* Name */}
                        <div className="text-center">
                            <p className="text-white font-bold text-sm drop-shadow-lg truncate max-w-full">
                                {bubble.student.name}
                            </p>
                            <p className="text-white/90 text-xs drop-shadow truncate max-w-full mt-1">
                                {bubble.student.gradeName}
                            </p>
                        </div>
                    </div>
                </div>
            ))}

            {/* Instructions */}
            <div className="absolute bottom-8 left-0 right-0 text-center z-10">
                <p className="text-white/80 text-sm md:text-base drop-shadow">
                    观看学员头像动画展示 • 自动循环播放 • 按 ESC 键返回
                </p>
            </div>
        </div>
    );
};

export default RosterSplash;
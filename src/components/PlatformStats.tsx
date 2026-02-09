import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface PlatformStats {
  total_locations: number;
  total_documents: number;
  total_temp_logs: number;
  total_checklists: number;
  total_hours_saved: number;
  total_money_saved: number;
}

function useCountUp(end: number, duration: number = 2000, isVisible: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number | null = null;
    const startValue = 0;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      setCount(Math.floor(progress * (end - startValue) + startValue));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [end, duration, isVisible]);

  return count;
}

export default function PlatformStats() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const { data, error } = await supabase
        .from('v_platform_stats')
        .select('*')
        .maybeSingle();

      if (!error && data) {
        setStats(data);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  const fallback = {
    total_locations: 12,
    total_documents: 340,
    total_temp_logs: 4200,
    total_checklists: 1850,
    total_hours_saved: 520,
    total_money_saved: 18200,
  };
  const s = stats || fallback;
  const locationsCount = useCountUp(s.total_locations, 2000, isVisible);
  const documentsCount = useCountUp(s.total_documents, 2000, isVisible);
  const tempLogsCount = useCountUp(s.total_temp_logs, 2000, isVisible);
  const checklistsCount = useCountUp(s.total_checklists, 2000, isVisible);
  const hoursSavedCount = useCountUp(s.total_hours_saved, 2000, isVisible);
  const moneySavedCount = useCountUp(s.total_money_saved, 2000, isVisible);

  const statItems = [
    { value: locationsCount, label: 'Locations Protected', suffix: '+' },
    { value: documentsCount, label: 'Documents Managed', suffix: '+' },
    { value: tempLogsCount, label: 'Temperature Logs', suffix: '+' },
    { value: checklistsCount, label: 'Checklists Completed', suffix: '+' },
    { value: hoursSavedCount, label: 'Hours Saved', suffix: '+' },
    { value: moneySavedCount.toLocaleString(), label: 'Money Saved', prefix: '$', suffix: '+' }
  ];

  return (
    <section ref={sectionRef} className="py-20 px-6 bg-[#1e4d6b]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-['Outfit'] text-4xl font-bold text-white mb-4">
            Trusted by Compliance Operations Teams Everywhere
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Real results from real teams managing compliance every day
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {statItems.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="font-['Outfit'] text-5xl font-bold text-[#d4af37] mb-2">
                {stat.prefix}{stat.value}{stat.suffix}
              </div>
              <div className="text-gray-300 text-sm font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

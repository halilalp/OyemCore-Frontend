import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Modal, Platform } from 'react-native';
import { useThemeStore } from '../store/useThemeStore';

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (dateStr: string) => void;
  title?: string;
  outputFormat?: 'dd.MM.yyyy' | 'yyyy-MM-dd';
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({ 
  visible, 
  onClose, 
  onSelectDate, 
  title = 'Tarih Seçin',
  outputFormat = 'dd.MM.yyyy'
}) => {
  const { colors } = useThemeStore();
  const styles = createStyles(colors);

  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth()); // 0-indexed

  const monthNames = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  const daysOfWeek = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOffset = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Map Sunday (0) to index 6, Monday (1) to 0
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const offset = getFirstDayOffset(currentYear, currentMonth);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleSelectDay = (dayNum: number) => {
    const formattedDay = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
    const formattedMonth = (currentMonth + 1) < 10 ? `0${currentMonth + 1}` : `${currentMonth + 1}`;
    
    let result = '';
    if (outputFormat === 'yyyy-MM-dd') {
      result = `${currentYear}-${formattedMonth}-${formattedDay}`;
    } else {
      result = `${formattedDay}.${formattedMonth}.${currentYear}`;
    }
    
    onSelectDate(result);
    onClose();
  };

  const gridCells: Array<{ dayNum?: number; key: string }> = [];
  for (let i = 0; i < offset; i++) {
    gridCells.push({ key: `empty-${i}` });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    gridCells.push({ dayNum: d, key: `day-${d}` });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          
          {/* Month/Year Navigation */}
          <View style={styles.header}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn} activeOpacity={0.7}>
              <Text style={styles.navBtnText}>◀</Text>
            </TouchableOpacity>
            <Text style={styles.headerLabel}>{monthNames[currentMonth]} {currentYear}</Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn} activeOpacity={0.7}>
              <Text style={styles.navBtnText}>▶</Text>
            </TouchableOpacity>
          </View>

          {/* Days of Week Label Header */}
          <View style={styles.weekdaysRow}>
            {daysOfWeek.map((day, idx) => (
              <Text key={idx} style={styles.weekdayLabel}>{day}</Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.grid}>
            {gridCells.map((cell) => {
              if (!cell.dayNum) {
                return <View key={cell.key} style={styles.dayCellEmpty} />;
              }
              const isToday = 
                now.getDate() === cell.dayNum && 
                now.getMonth() === currentMonth && 
                now.getFullYear() === currentYear;

              return (
                <TouchableOpacity
                  key={cell.key}
                  style={[styles.dayCell, isToday && styles.todayCell]}
                  onPress={() => handleSelectDay(cell.dayNum!)}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.dayText, isToday && styles.todayText]}>
                    {cell.dayNum}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Text style={styles.closeBtnText}>Vazgeç</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navBtn: {
    padding: 8,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 36,
    alignItems: 'center',
  },
  navBtnText: {
    fontSize: 10,
    color: colors.text,
  },
  headerLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weekdayLabel: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    opacity: 0.8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  dayCell: {
    width: '14.28%',
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  dayCellEmpty: {
    width: '14.28%',
    height: 36,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  todayCell: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  todayText: {
    color: colors.primary,
    fontWeight: '800',
  },
  closeBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    borderRadius: 12,
  },
  closeBtnText: {
    color: colors.danger,
    fontWeight: '800',
    fontSize: 13,
  },
});

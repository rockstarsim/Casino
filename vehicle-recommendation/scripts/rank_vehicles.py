#!/usr/bin/env python3
"""Car recommendation scoring for user profile - TOP 100 ranking."""

from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "output"

ANNUAL_KM = 13000  # weekly 100-150km + trips + domestic travel
YEARS = 5
FUEL_PRICE = 1650  # won/L
ELEC_PRICE = 280  # won/kWh home
BUDGET = 1700  # 만원 (10M savings + 7M Ray)
MONTHLY_INCOME = 250  # 만원

@dataclass
class Vehicle:
    rank: int = 0
    name: str = ""
    year_range: str = ""
    powertrain: str = ""  # EV, HEV, PHEV, ICE, MHEV
    price_man: int = 0  # purchase price 만원
    fuel_km_l: float = 0  # or km/kWh for EV
    annual_fuel_man: float = 0
    annual_maint_man: float = 0
    annual_insurance_man: float = 0
    annual_tax_man: float = 0
    deprec_5y_pct: float = 0  # % lost over 5 years
    residual_man: float = 0
    tco_5y_man: float = 0
    score_must: float = 0  # max 20
    score_tco: float = 0  # max 25
    score_ride: float = 0  # max 15
    score_perf: float = 0  # max 10
    score_practical: float = 0  # max 10
    score_disaster: float = 0  # max 10
    score_rare_dep: float = 0  # max 10
    total_score: float = 0
    notes: str = ""
    budget_fit: str = ""  # O=within, L=loan needed, U=used only

def calc_tco(v: Vehicle) -> Vehicle:
    if v.powertrain == "EV":
        kwh_per_100 = 100 / v.fuel_km_l if v.fuel_km_l else 18
        v.annual_fuel_man = ANNUAL_KM / 100 * kwh_per_100 * ELEC_PRICE / 10000
    else:
        v.annual_fuel_man = ANNUAL_KM / v.fuel_km_l * FUEL_PRICE / 10000 if v.fuel_km_l else 150
    
    dep_loss = v.price_man * v.deprec_5y_pct / 100
    v.residual_man = v.price_man - dep_loss
    v.tco_5y_man = (
        v.price_man
        + v.annual_fuel_man * YEARS
        + v.annual_maint_man * YEARS
        + v.annual_insurance_man * YEARS
        + v.annual_tax_man * YEARS
        - v.residual_man
    )
    return v

def score_tco_value(tco: float, price: float) -> float:
    # Lower TCO = higher score; normalize around 1500-3500만 5yr range
    if tco <= 1200: return 25
    if tco <= 1500: return 23
    if tco <= 1800: return 21
    if tco <= 2100: return 19
    if tco <= 2400: return 17
    if tco <= 2700: return 15
    if tco <= 3000: return 13
    if tco <= 3300: return 11
    if tco <= 3600: return 9
    return max(5, 25 - (tco - 1200) / 120)

# Vehicle database - 100 variants
vehicles_raw = [
    # === TIER S: Best overall for this user ===
    ("토요타 RAV4 HEV 4WD", "2019-22 중고", "HEV", 2650, 16.1, 35, 95, 28, 45, 20,
     14, 8.5, 9, 8.5, 9, "감가방어 1위급. ACC/통풍 상위트림. 4WD 폭설대응. 흔함(-)", "O"),
    ("렉서스 NX350h AWD", "2021-23 중고", "HEV", 3200, 14.5, 38, 110, 105, 35, 22,
     20, 13, 14, 8, 8, 9, "승차감·내구성 최상. 감가 완만. 주차보조 우수", "L"),
    ("토요타 RAV4 PHEV AWD", "2022-24 중고", "PHEV", 3400, 25.0, 30, 40, 100, 30, 28,
     20, 12, 13, 9, 8.5, 8.5, "공회전 EV모드. 75km 전기주행. 재난 V2L", "L"),
    ("혼다 CR-V HEV AWD", "2023-25 중고", "HEV", 3100, 15.2, 36, 38, 98, 32, 24,
     20, 13, 13.5, 8.5, 9, 8.5, "실내 넓음. 통풍·ACC 기본급↑. 내구성", "L"),
    ("기아 셀토스 HEV 시그니처", "2026 신차", "HEV", 3470, 18.5, 28, 32, 88, 25, 30,
     20, 14, 12, 8.5, 8.5, 6, "연비1등급. V2L. 주차쉬움. 다소 흔함", "L"),
    ("현대 코나 HEV 프리미엄", "2025-26 신차", "HEV", 3400, 17.5, 30, 30, 85, 25, 32,
     20, 14, 11.5, 8.5, 8, 6.5, "컴팩트·주차용이. 120kg OK", "L"),
    ("토요타 캠리 HEV", "2022-24 중고", "HEV", 2600, 16.8, 32, 35, 90, 28, 20,
     20, 15, 13, 8, 7.5, 8, "승차감 우수. 트렁크 큼. 세단", "O"),
    ("렉서스 ES300h", "2020-22 중고", "HEV", 2900, 15.8, 34, 40, 95, 30, 22,
     20, 14, 14.5, 7.5, 7, 9.5, "승차감 최고급. 감가방어. 세단", "L"),
    ("혼다 어코드 HEV", "2023-25 중고", "HEV", 2800, 16.5, 33, 36, 92, 28, 23,
     20, 14, 13, 8.5, 7.5, 8.5, "공회전 우수. 오디오 개선여지", "O"),
    ("현대 싼타페 HEV 2.5T", "2024-26 중고/신", "HEV", 3600, 13.5, 42, 45, 105, 40, 32,
     20, 11, 13.5, 9, 9.5, 6, "3열·짐최대. e모션드라이브. 크지만 RSPA", "L"),
    
    # === HEV/PHEV mid SUV ===
    ("기아 스포티지 HEV 4WD", "2024-26", "HEV", 3800, 15.0, 40, 38, 95, 35, 30,
     20, 11, 12, 8.5, 9, 5, "옵션풍부. 흔함. 4WD 폭설", "L"),
    ("현대 투싼 HEV N Line", "2024-26", "HEV", 3700, 15.5, 38, 36, 92, 33, 30,
     20, 11, 12.5, 9, 8.5, 5.5, "빠릿함. 흔함", "L"),
    ("기아 쏘렌토 HEV 4WD", "2023-25 중고", "HEV", 3400, 12.8, 48, 48, 100, 42, 28,
     20, 10, 12, 8.5, 10, 6, "7인·짐. HTRAC. 자동출차", "L"),
    ("현대 팰리세이드 HEV", "2025-26", "HEV", 4800, 11.5, 55, 55, 120, 55, 35,
     20, 8, 13, 8, 10, 7, "스테이모드 20분. 대형·RSPA필수", "L"),
    ("토요타 하이랜더 HEV AWD", "2022-24 중고", "HEV", 3800, 13.2, 45, 42, 105, 40, 26,
     20, 10, 13, 8, 9.5, 8.5, "3열·신뢰성. 내구성", "L"),
    ("렉서스 RX350h AWD", "2023-25 중고", "HEV", 4500, 13.0, 48, 55, 115, 45, 25,
     20, 9, 14.5, 8.5, 9, 9, "승차감·감가 최상급", "L"),
    ("볼보 XC60 B5/B4 HEV", "2021-23 중고", "MHEV", 3200, 11.5, 52, 55, 110, 38, 30,
     19, 11, 14, 8, 8.5, 8.5, "승차감·안전. 감가 양호", "L"),
    ("볼보 XC40 Recharge Pure", "2022-24 중고", "EV", 2800, 5.2, 25, 28, 95, 15, 45,
     18, 14, 13, 8.5, 7.5, 8, "EV TCO. 컴팩트. 감가주의", "O"),
    ("BMW X1 xDrive25e", "2022-24 중고", "PHEV", 3500, 22.0, 32, 50, 115, 35, 35,
     19, 11, 12.5, 9, 7.5, 7.5, "PHEV 공회전. 주행성", "L"),
    ("아udi Q4 e-tron 40", "2023-24 중고", "EV", 3200, 5.0, 28, 35, 105, 18, 42,
     18, 12, 13, 8.5, 8, 8, "EV·승차감 균형", "L"),
    
    # === EV options ===
    ("현대 아이오닉5 RWD 롱레인지", "2022-24 중고", "EV", 2900, 5.5, 22, 25, 90, 12, 45,
     18, 13, 12.5, 9.5, 8.5, 6, "V2L 3.6kW. 빠름. 감가큼", "O"),
    ("기아 EV6 RWD 롱레인지", "2022-24 중고", "EV", 2850, 5.3, 23, 26, 92, 12, 44,
     18, 13, 12, 9.5, 8.5, 6.5, "주행성·V2L. 감가주의", "O"),
    ("현대 코na Electric", "2023-25 중고", "EV", 2200, 6.0, 18, 22, 80, 10, 48,
     18, 15, 11, 8, 7.5, 6, "예산맞춤 EV. 컴팩트", "O"),
    ("기아 니로 EV", "2022-24 중고", "EV", 2100, 5.8, 19, 24, 82, 10, 46,
     18, 15, 11.5, 7.5, 8, 6.5, "실용 EV. 짐OK", "O"),
    ("테슬라 모델3 RWD", "2022-23 중고", "EV", 2700, 5.8, 20, 20, 95, 10, 46,
     17, 13, 11, 10, 7, 5, "성능·오디오. 흔함·감가", "O"),
    ("테슬라 모델Y RWD", "2022-23 중고", "EV", 3200, 5.2, 24, 22, 100, 12, 44,
     17, 11, 11.5, 9.5, 9, 5, "짐·성능. 흔함", "L"),
    ("BMW iX1", "2023-24 중고", "EV", 3800, 5.0, 28, 38, 110, 15, 40,
     17, 10, 13, 9, 8, 7, "프리미엄 EV", "L"),
    ("메르cedes EQA/EQB", "2022-24 중고", "EV", 3000, 5.2, 26, 40, 105, 15, 42,
     17, 12, 12.5, 8, 8, 7.5, "프리미엄 컴팩트 EV", "L"),
    ("폭스바겐 ID.4 Pro", "2022-23 중고", "EV", 2600, 5.0, 26, 30, 95, 14, 43,
     17, 13, 12.5, 8.5, 8, 7.5, "공간·승차감", "O"),
    ("현대 아이오닉5 N", "2023-24 중고", "EV", 4200, 4.8, 30, 30, 110, 12, 42,
     17, 8, 11, 10, 8, 7, "고성능 EV", "L"),
    
    # === Compact / unique ===
    ("지프 어벤저 4xe MHEV", "2024-25", "MHEV", 4200, 14.0, 42, 45, 100, 38, 30,
     19, 9, 11.5, 8.5, 9.5, 9.5, "210mm지상고. 400mm도하. 희소", "L"),
    ("서브aru Forester e-Boxer", "2020-22 중고", "HEV", 2400, 13.5, 40, 38, 88, 32, 25,
     19, 14, 12.5, 7.5, 9.5, 9, "AWD표준. 폭설·험로", "O"),
    ("서브aru Outback", "2020-22 중고", "HEV", 2600, 12.5, 45, 40, 90, 35, 24,
     19, 13, 13, 8, 9.5, 9, "220mm지상고. AWD", "O"),
    ("마쯔da CX-60 PHEV AWD", "2023-25 중고", "PHEV", 3800, 20.0, 35, 42, 105, 35, 32,
     19, 10, 13.5, 8.5, 8.5, 9, "승차감·디자인. 희소", "L"),
    ("마쯔da CX-5 2.5 AWD", "2020-22 중고", "ICE", 1900, 10.5, 55, 35, 82, 38, 22,
     18, 16, 12.5, 8, 8.5, 8.5, "예산맞춤. 승차감. 가솔린", "O"),
    ("미니 Countryman SE ALL4", "2024-25", "PHEV", 5200, 18.0, 38, 45, 110, 40, 35,
     18, 7, 12, 8.5, 7.5, 9.5, "희소·개성. PHEV", "L"),
    ("BMW X2 xDrive25e", "2022-24 중고", "PHEV", 3300, 20.0, 34, 48, 108, 35, 34,
     18, 11, 12, 9, 7.5, 8, "컴팩트·빠름", "L"),
    ("아udi A3 Sportback e-tron", "2021-23 중고", "PHEV", 2800, 22.0, 30, 45, 100, 32, 33,
     18, 13, 12.5, 8.5, 7, 8.5, "PHEV 세단", "O"),
    ("폭스바겐 티구안 eHybrid", "2022-24 중고", "PHEV", 3600, 18.0, 38, 42, 102, 36, 32,
     18, 10, 12.5, 8.5, 8.5, 8, "PHEV SUV", "L"),
    ("링컨 Corsair Grand Touring", "2022-23 중고", "PHEV", 3400, 19.0, 36, 48, 105, 38, 33,
     18, 11, 13, 8, 8, 8.5, "레벨오디오. PHEV", "L"),
    
    # === Used value picks under budget ===
    ("기아 스포티지 HEV NQ5", "2022-23 중고", "HEV", 2800, 15.5, 36, 35, 88, 30, 32,
     20, 14, 12, 8.5, 9, 6, "중고가성비. 옵션풍부", "O"),
    ("현대 투싼 HEV NX4", "2022-23 중고", "HEV", 2750, 15.8, 35, 34, 86, 28, 31,
     20, 14, 12.5, 9, 8.5, 6, "중고가성비", "O"),
    ("기아 K5 HEV", "2022-24 중고", "HEV", 2200, 17.2, 30, 30, 82, 25, 30,
     20, 16, 12, 8.5, 7.5, 7, "세단·연비·예산", "O"),
    ("현대 그랜저 HEV", "2023-24 중고", "HEV", 3000, 14.8, 38, 38, 95, 35, 28,
     20, 12, 13.5, 8, 8, 7.5, "대형세단·승차감", "L"),
    ("기아 K8 HEV", "2022-24 중고", "HEV", 2700, 14.5, 38, 36, 92, 32, 29,
     20, 13, 13.5, 8, 7.5, 7.5, "프리미엄 국산 세단", "O"),
    ("현대 싼타페 HEV TM", "2021-23 중고", "HEV", 2800, 13.0, 42, 40, 92, 35, 30,
     20, 13, 12.5, 8.5, 9.5, 6.5, "중고 3열 SUV", "O"),
    ("기아 쏘렌토 HEV MQ4", "2021-23 중고", "HEV", 2900, 12.5, 44, 42, 95, 38, 28,
     20, 12, 12, 8.5, 10, 6.5, "중고 대형 SUV", "O"),
    ("현대 스타리아 HEV", "2023-25 중고", "HEV", 3500, 11.0, 50, 45, 100, 45, 30,
     19, 10, 12, 7.5, 11, 7, "짐·캠핑·MPV", "L"),
    ("기아 카니발 HEV", "2024-25 중고", "HEV", 3800, 10.5, 52, 48, 105, 48, 28,
     19, 9, 11.5, 7.5, 11, 7, "짐최대. 주차어려움", "L"),
    ("현대 코na HEV", "2023-24 중고", "HEV", 2400, 17.8, 28, 28, 80, 22, 33,
     20, 15, 11.5, 8.5, 7.5, 7, "예산맞춤 컴팩트", "O"),
    
    # === Premium / less common ===
    ("렉서스 UX250h", "2020-22 중고", "HEV", 2700, 16.0, 32, 38, 95, 28, 24,
     20, 14, 13.5, 8, 7, 9.5, "컴팩트·프리미엄·희소", "O"),
    ("렉서스 NX450h+", "2022-24 중고", "PHEV", 4200, 22.0, 35, 55, 115, 35, 30,
     20, 8, 14, 8.5, 8.5, 9.5, "PHEV 프리미um", "L"),
    ("토요ota 프리우스 5세대 HEV", "2023-25", "HEV", 3200, 22.0, 25, 28, 85, 22, 25,
     20, 13, 13, 7.5, 7, 8.5, "연비최강. 디자인", "L"),
    ("토요ota 프리우스 PHEV", "2023-25", "PHEV", 4200, 30.0, 28, 30, 95, 28, 30,
     20, 9, 13.5, 8, 7.5, 9, "PHEV 연비·공회전", "L"),
    ("혼다 시ivic HEV", "2023-25", "HEV", 2900, 18.5, 28, 32, 88, 25, 26,
     20, 13, 12.5, 9, 7, 8, "빠름·연비", "L"),
    ("혼다 HR-V e:HEV", "2023-25 중고", "HEV", 2600, 16.0, 32, 34, 85, 28, 26,
     20, 14, 12, 8, 7.5, 8.5, "소형 SUV·혼다", "O"),
    ("토요ota Yaris Cross HEV", "2022-24 중고", "HEV", 2200, 18.0, 28, 30, 78, 22, 24,
     20, 15, 11.5, 7.5, 7.5, 9, "소형·연비·희소", "O"),
    ("토요ota CH-R HEV", "2020-22 중고", "HEV", 2100, 17.5, 30, 32, 80, 24, 22,
     20, 15, 12, 8, 7, 9, "개성·희소·컴팩트", "O"),
    ("BMW 330e", "2021-23 중고", "PHEV", 3200, 20.0, 32, 50, 110, 38, 35,
     18, 11, 13, 9.5, 7, 7.5, "PHEV 세단·주행성", "L"),
    ("BMW X3 xDrive30e", "2022-24 중고", "PHEV", 4200, 18.0, 38, 52, 118, 42, 34,
     18, 8, 13, 9, 8.5, 7.5, "PHEV SUV", "L"),
    
    # === More models to reach 100 ===
    ("Mercedes GLC 300e", "2022-24 중고", "PHEV", 4500, 17.0, 42, 55, 120, 45, 36,
     18, 7, 13.5, 8.5, 8.5, 7.5, "PHEV·승차감", "L"),
    ("Audi Q5 55 TFSI e", "2021-23 중고", "PHEV", 4000, 16.0, 40, 52, 115, 42, 34,
     18, 8, 13, 8.5, 8.5, 8, "PHEV SUV", "L"),
    ("Volvo XC90 Recharge", "2021-23 중고", "PHEV", 4800, 14.0, 48, 58, 125, 50, 32,
     18, 7, 14, 8, 10, 8.5, "3열·안전", "L"),
    ("Land Rover Defender 110 P400e", "2022-24 중고", "PHEV", 8500, 12.0, 65, 80, 150, 65, 35,
     17, 3, 12, 8.5, 10, 9.5, "재난최강·비쌈", "L"),
    ("Land Rover Discovery Sport", "2020-22 중고", "MHEV", 2800, 11.0, 50, 55, 105, 42, 32,
     17, 12, 13, 8, 9, 8.5, "지상고·AWD", "O"),
    ("Jeep Compass 4xe", "2022-24 중고", "PHEV", 3200, 16.0, 40, 45, 98, 38, 35,
     17, 11, 11.5, 8, 8.5, 9, "PHEV·오프로드", "L"),
    ("Ford Kuga/Escape PHEV", "2021-23 중고", "PHEV", 2600, 17.0, 38, 40, 92, 35, 36,
     17, 13, 12, 8, 8, 8, "PHEV·가성비", "O"),
    ("Ford Bronco Sport", "2021-23 중고", "ICE", 2800, 9.5, 58, 42, 95, 40, 30,
     16, 11, 11.5, 8.5, 9.5, 8.5, "AWD·지상고", "L"),
    ("Toyota 4Runner", "2018-22 중고", "ICE", 3500, 8.5, 70, 40, 100, 45, 22,
     16, 9, 11, 8, 10, 9, "재난·내구·연비↓", "L"),
    ("Lexus GX550", "2024-25", "ICE", 9500, 7.5, 85, 60, 140, 70, 18,
     16, 2, 13, 8.5, 10, 9.5, "오프로드·프레임", "L"),
    
    ("Hyundai Ioniq6 LR", "2023-24 중고", "EV", 3100, 5.8, 22, 24, 92, 12, 44,
     18, 12, 13.5, 9, 7.5, 7, "EV 세단·효율", "L"),
    ("Kia EV3 LR", "2025-26", "EV", 3500, 5.5, 24, 26, 88, 12, 38,
     18, 11, 12, 9, 8, 8, "신형 EV·V2L", "L"),
    ("Kia EV9 AWD", "2024-25 중고", "EV", 5500, 4.5, 32, 35, 120, 18, 42,
     17, 5, 13, 9, 10, 8, "3열 EV·V2L", "L"),
    ("Genesis GV70 Electrified", "2023-24 중고", "EV", 4500, 4.8, 30, 38, 115, 20, 40,
     17, 7, 14, 9.5, 8.5, 8.5, "프리미엄 EV", "L"),
    ("Genesis GV70 2.5T AWD", "2022-24 중고", "ICE", 3200, 9.0, 60, 45, 105, 42, 32,
     17, 10, 14, 9.5, 8.5, 8, "승차감·성능", "L"),
    ("Genesis G80 2.5T AWD", "2022-24 중고", "ICE", 3000, 9.5, 55, 48, 108, 45, 30,
     17, 11, 14.5, 9, 8, 8.5, "승차감 최고급", "L"),
    ("Hyundai Niro HEV", "2023-24 중고", "HEV", 2300, 18.0, 28, 28, 82, 22, 32,
     20, 15, 11.5, 7.5, 8, 7.5, "실용·연비", "O"),
    ("Kia Seltos Turbo 1.6 AWD", "2024-25 중고", "ICE", 2400, 11.0, 50, 32, 85, 32, 28,
     17, 14, 11, 9, 8, 6.5, "가솔린·빠름", "O"),
    ("Hyundai Tucson 1.6T AWD", "2022-23 중고", "ICE", 2300, 10.8, 52, 34, 84, 35, 28,
     17, 14, 11.5, 8.5, 8.5, 6, "중고 ICE 가성비", "O"),
    ("Mazda CX-30 AWD", "2021-23 중고", "ICE", 2000, 11.5, 48, 32, 78, 30, 24,
     17, 15, 12.5, 8, 7.5, 9, "컴팩트·승차감", "O"),
    
    ("Lincoln Nautilus Hybrid", "2024-25", "HEV", 6500, 11.5, 52, 55, 130, 55, 30,
     18, 5, 14.5, 8.5, 9, 8, "28스피커·승차감", "L"),
    ("Cadillac Lyriq RWD", "2023-24 중고", "EV", 5200, 4.6, 32, 35, 125, 18, 44,
     16, 6, 13.5, 9, 8.5, 8.5, "프리미엄 EV·희소", "L"),
    ("Porsche Macan Electric", "2025-26", "EV", 9500, 4.5, 35, 45, 150, 25, 38,
     15, 2, 13, 10, 8, 9.5, "고성능·희소·비쌈", "L"),
    ("Alfa Romeo Tonale PHEV", "2023-24 중고", "PHEV", 3800, 17.0, 38, 50, 110, 40, 38,
     16, 9, 12.5, 9, 7.5, 9.5, "이탈리아·희소", "L"),
    ("VW Golf eHybrid GTE", "2021-23 중고", "PHEV", 2800, 20.0, 32, 42, 98, 32, 34,
     17, 12, 12, 9, 7, 8.5, "PHEV 해치백", "O"),
    ("VW Arteon Shooting Brake", "2021-22 중고", "ICE", 2500, 10.0, 55, 45, 100, 40, 32,
     16, 12, 13, 8.5, 8.5, 9, "슈팅브레이크·희소", "O"),
    ("BMW 2 Series Active Tourer 230e", "2022-24 중고", "PHEV", 3600, 19.0, 36, 48, 108, 38, 34,
     17, 10, 12.5, 8.5, 8, 8, "MPV형·PHEV", "L"),
    ("Mercedes B250e/B-Class", "2020-21 중고", "EV", 1800, 5.5, 20, 35, 90, 12, 50,
     16, 16, 12, 7.5, 7.5, 8, "저예산 EV·컴팩트", "O"),
    ("Nissan Ariya B6", "2023-24 중고", "EV", 3200, 5.2, 26, 28, 95, 14, 44,
     16, 11, 12.5, 8.5, 8, 7.5, "EV·승차감", "L"),
    ("Mitsubishi Outlander PHEV", "2022-24 중고", "PHEV", 2800, 16.0, 38, 38, 90, 35, 30,
     17, 12, 11.5, 7.5, 9, 8.5, "AWD PHEV·7인", "O"),
    
    ("Hyundai Palisade 2.2D AWD", "2020-22 중고", "ICE", 2500, 11.5, 48, 42, 95, 45, 25,
     16, 13, 12, 8, 9.5, 7, "디젤·짐·감가방어", "O"),
    ("Kia Mohave 3.0D AWD", "2020-22 중고", "ICE", 2800, 9.5, 58, 45, 98, 48, 24,
     16, 11, 12.5, 8.5, 10, 8, "프레임·재난·디젤", "L"),
    ("Toyota Land Cruiser Prado", "2024-25", "HEV", 6500, 10.5, 55, 45, 120, 55, 20,
     17, 5, 13, 8.5, 10, 9.5, "재난최강·비쌈", "L"),
    ("Suzuki Jimny", "2019-23 중고", "ICE", 1800, 11.0, 45, 25, 70, 28, 18,
     14, 15, 9, 6.5, 8.5, 10, "초소형·오프로드·옵션부족", "O"),
    ("Hyundai Casper HEV", "2025-26", "HEV", 2100, 19.0, 25, 25, 72, 18, 28,
     18, 16, 10, 7, 6.5, 8, "초소형·주차·120kg tight", "O"),
    ("Kia Ray HEV", "2024-25", "HEV", 1900, 20.0, 22, 22, 68, 16, 25,
     15, 16, 9.5, 6.5, 6, 7, "현재차 업그레이드", "O"),
    ("Toyota Sienna HEV AWD", "2022-24 중고", "HEV", 4200, 12.5, 42, 40, 105, 45, 24,
     18, 8, 12.5, 7.5, 10, 8.5, "MPV·7인·AWD", "L"),
    ("Honda Odyssey", "2021-23 중고", "HEV", 3500, 12.0, 45, 38, 98, 42, 26,
     17, 10, 12, 7.5, 9.5, 8, "MPV·공간", "L"),
    ("Volvo V60 Cross Country", "2020-22 중고", "MHEV", 2600, 11.0, 48, 48, 100, 38, 28,
     17, 13, 13.5, 8, 8.5, 9.5, "왜건·희소·AWD", "O"),
    ("Audi A4 Avant 45 TFSI quattro", "2021-23 중고", "ICE", 2800, 10.5, 52, 50, 105, 40, 32,
     16, 11, 13, 8.5, 8, 8.5, "왜건·quattro", "L"),
]

vehicles = []
for i, row in enumerate(vehicles_raw):
    if len(row) == 18:
        name, yr, pt, price, eff, maint, ins, tax, dep = row[:9]
        must, ride, perf, prac, dis, rare, note, bf = row[10:]
    else:
        name, yr, pt, price, eff, maint, ins, tax, dep, must, ride, perf, prac, dis, rare, note, bf = row
    v = Vehicle(
        name=name, year_range=yr, powertrain=pt, price_man=price,
        fuel_km_l=eff, annual_maint_man=maint, annual_insurance_man=ins,
        annual_tax_man=tax, deprec_5y_pct=dep,
        score_must=must, score_ride=ride, score_perf=perf,
        score_practical=prac, score_disaster=dis, score_rare_dep=rare,
        notes=note, budget_fit=bf
    )
    calc_tco(v)
    v.score_tco = score_tco_value(v.tco_5y_man, v.price_man)
    v.total_score = v.score_must + v.score_tco + v.score_ride + v.score_perf + v.score_practical + v.score_disaster + v.score_rare_dep
    vehicles.append(v)

vehicles.sort(key=lambda x: x.total_score, reverse=True)
for i, v in enumerate(vehicles, 1):
    v.rank = i

# Output
lines = []
def out(s=""):
    lines.append(s)
    print(s)

out("=" * 120)
out("차량 추천 TOP 100 | 예산 1,700만원(레이 매각 포함) | 연간 13,000km | 5년 TCO 기준")
out("=" * 120)
out(f"{'순위':>4} {'차량':<38} {'연식':<14} {'PT':<5} {'매입':>6} {'5yrTCO':>7} {'총점':>5} {'예산':>4}")
out("-" * 120)
for v in vehicles[:100]:
    out(f"{v.rank:>4} {v.name:<38} {v.year_range:<14} {v.powertrain:<5} {v.price_man:>5}만 {v.tco_5y_man:>6.0f}만 {v.total_score:>5.1f} {v.budget_fit:>4}")

out("\n\n=== TOP 10 상세 ===")
for v in vehicles[:10]:
    out(f"\n#{v.rank} {v.name} ({v.year_range})")
    out(f"  매입가: {v.price_man}만 | 5년TCO: {v.tco_5y_man:.0f}만 | 잔존가(5yr): {v.residual_man:.0f}만")
    out(f"  연간: 연료{v.annual_fuel_man:.0f}만+정비{v.annual_maint_man:.0f}만+보험{v.annual_insurance_man:.0f}만+세금{v.annual_tax_man:.0f}만")
    out(f"  점수: 필수{v.score_must}+TCO{v.score_tco:.0f}+승차{v.score_ride}+성능{v.score_perf}+실용{v.score_practical}+재난{v.score_disaster}+희소/감가{v.score_rare_dep} = {v.total_score:.1f}")
    out(f"  {v.notes}")

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
(OUTPUT_DIR / "top100-ranking.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")

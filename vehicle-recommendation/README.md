# 차량 추천 (Vehicle Recommendation)

인천 거주 30대 초반 남성 운전자를 위한 **TCO·총점 기반 차량 비교** 프로젝트입니다.  
현재 기아 레이(2013, 134,000km) 교체를 전제로 100개 후보 차량을 평가합니다.

## 폴더 구조

```
vehicle-recommendation/
├── README.md                 # 이 파일
├── docs/
│   ├── user-profile.md       # 구매 조건·제약
│   └── recommendations.md    # 실전 TOP 5 및 용도별 추천
├── scripts/
│   └── rank_vehicles.py      # TCO·총점 산출 스크립트
└── output/
    └── top100-ranking.txt    # 최신 순위표 (스크립트 실행 결과)
```

## 빠른 실행

```bash
cd vehicle-recommendation
python3 scripts/rank_vehicles.py | tee output/top100-ranking.txt
```

## 분석 전제

| 항목 | 값 |
|------|-----|
| 예산 | 약 1,700만원 (현금 1,000만 + 레이 매각 ~700만) |
| 연간 주행 | 약 13,000km |
| TCO 기간 | 5년 |
| 제외 브랜드 | 르노, 쌍용, 쉐보레, 중국 브랜드 |

## 총점 구성 (100점)

- 필수 옵션 20 · 5년 TCO 25 · 승차감 15 · 성능 10
- 실용(짐·공간) 10 · 재난 대응 10 · 희소성·감가 10

## 실전 1순위 (종합)

**토요타 RAV4 HEV 4WD (2019~22 중고)** — 승차감·감가·재난·고속 안정성 균형

자세한 내용은 [docs/recommendations.md](docs/recommendations.md)를 참고하세요.

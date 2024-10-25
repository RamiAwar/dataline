import json
from enum import StrEnum

from mirascope.core import prompt_template
from pydantic import BaseModel, ValidationInfo, field_validator


class ChartType(StrEnum):
    bar = "bar"
    doughnut = "doughnut"
    line = "line"
    scatter = "scatter"
    # bubble = "bubble"
    # radar = "radar"


TEMPLATES: dict[ChartType, str] = {
    ChartType.line: """{
  type: 'line',
  data: {
  labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
  datasets: [{
    data: [65, 59, 80, 81, 56, 55, 40],
    fill: false,
    tension: 0.1
  }]
},
  options: {
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Numbers per month'
      }
    },
    scales: {
      x: {
        beginAtZero: true
      }
    }
  }
}""",
    ChartType.bar: """{
    type: 'bar',
    data: {
    labels: ['Cats', 'Dogs', 'Sheep', 'Goats', 'Cows', 'Pigs', 'Chickens'],
    datasets: [{
      data: [65, 59, 80, 81, 56, 55, 40],
      backgroundColor: [
        'rgba(255, 99, 132, 0.5)',
        'rgba(255, 159, 64, 0.5)',
        'rgba(255, 205, 86, 0.5)',
        'rgba(75, 192, 192, 0.5)',
        'rgba(54, 162, 235, 0.5)',
        'rgba(153, 102, 255, 0.5)',
        'rgba(201, 203, 207, 0.5)'
      ],
      borderColor: [
        'rgb(255, 99, 132)',
        'rgb(255, 159, 64)',
        'rgb(255, 205, 86)',
        'rgb(75, 192, 192)',
        'rgb(54, 162, 235)',
        'rgb(153, 102, 255)',
        'rgb(201, 203, 207)'
      ],
      borderWidth: 1
    }]
  },
  options: {
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: true,
          text: 'Numbers per month'
        }
      }
   }
};""",
    ChartType.doughnut: """{
    type: 'doughnut',
    data: {
      labels: [
        'Red',
        'Blue',
        'Yellow'
      ],
      datasets: [{
        data: [300, 50, 100],
        backgroundColor: [
          'rgb(255, 99, 132)',
          'rgb(54, 162, 235)',
          'rgb(255, 205, 86)'
        ],
        hoverOffset: 4
      }]
    },
    options: {
      plugins: {
        legend: {
          display: true
        },
        title: {
          display: true,
          text: 'Numbers per month'
        }
      }
    }
  }""",
    ChartType.scatter: """{
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Scatter Dataset',
        data: [{
          x: -10,
          y: 0
        }, {
          x: 0,
          y: 10
        }, {
          x: 10,
          y: 5
        }]
      }]
    },
    options: {
      scales: {
        x: {
          type: 'linear',
          position: 'bottom'
        },
        y: {
          type: 'linear',
          position: 'left'
        }
      }
    }
  };
  """,
    # ChartType.bubble: """{
    #   datasets: [{
    #     data: [{
    #       x: 20,
    #       y: 30,
    #       r: 15
    #     }, {
    #       x: 40,
    #       y: 10,
    #       r: 10
    #     }],
    #     backgroundColor: 'rgb(255, 99, 132)'
    #   }]
    # }""",
    #     ChartType.radar: """{
    #   type: 'radar',
    #   data: {
    #   labels: [
    #     'Eating',
    #     'Drinking',
    #     'Sleeping',
    #     'Designing',
    #     'Coding',
    #     'Cycling',
    #     'Running'
    #   ],
    #   datasets: [{
    #     data: [65, 59, 90, 81, 56, 55, 40],
    #     fill: true,
    #     backgroundColor: 'rgba(255, 99, 132, 0.5)',
    #     borderColor: 'rgb(255, 99, 132)',
    #     pointBackgroundColor: 'rgb(255, 99, 132)',
    #     pointBorderColor: '#fff',
    #     pointHoverBackgroundColor: '#fff',
    #     pointHoverBorderColor: 'rgb(255, 99, 132)'
    #   }, {
    #     label: 'My Second Dataset',
    #     data: [28, 48, 40, 19, 96, 27, 100],
    #     fill: true,
    #     backgroundColor: 'rgba(54, 162, 235, 0.5)',
    #     borderColor: 'rgb(54, 162, 235)',
    #     pointBackgroundColor: 'rgb(54, 162, 235)',
    #     pointBorderColor: '#fff',
    #     pointHoverBackgroundColor: '#fff',
    #     pointHoverBorderColor: 'rgb(54, 162, 235)'
    #   }]
    # },
    #   options: {
    #     elements: {
    #       line: {
    #         borderWidth: 3
    #       }
    #     }
    #   },
    # }""",
}


class GeneratedChart(BaseModel):
    chartjs_json: str

    @field_validator("chartjs_json", mode="before")
    @classmethod
    def check_alphanumeric(cls, v: str | dict, info: ValidationInfo) -> str:
        if isinstance(v, dict):
            # check chart type - fails if not in valid types
            v["type"] = ChartType[v["type"]]
            # convert to json str
            v = json.dumps(v)

        elif isinstance(v, str):
            v_dict = json.loads(v)
            # check chart type - this fails if not in valid types
            v_dict["type"] = ChartType[v_dict["type"]]
        return v


@prompt_template()
def generate_chart(chartjs_template: str, chart_type: ChartType, request: str) -> str:
    return f"""
    Create a chartjs.org chart of type {chart_type} that would be appropriate for this data.
    Create a valid ChartJS config for this chart. Only return the valid JSON config.
    Don't use more than 5 colours.
    Make sure to avoid this error: Give the chart a relevant title, based on this request: {request}.

    For the input data, just fill in dummy data that matches the described data you're given and it's format.
    You can input dummy data like the examples you are given. The user will then replace these with the real data from the SQL results.

    Here is an example ChartJS config:
    {chartjs_template}
    """

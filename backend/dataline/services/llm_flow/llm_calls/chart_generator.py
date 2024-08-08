from enum import Enum
from typing import Type

from mirascope import tags
from mirascope.openai import OpenAICallParams, OpenAIExtractor
from pydantic import BaseModel, Field


class ChartType(Enum):
    bar = "bar"
    doughnut = "doughnut"
    line = "line"
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
    #     ChartType.bubble: """{
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


class ShouldGenerateChart(BaseModel):
    should_generate_chart: bool
    chart_type: ChartType | None = None
    query: str | None = Field(
        default=None, description="Translate human query into a query that can be used to generate a chart."
    )


@tags(["version:0001"])
class ShouldGenerateChartCall(OpenAIExtractor[ShouldGenerateChart]):
    extract_schema: Type[ShouldGenerateChart] = ShouldGenerateChart
    call_params = OpenAICallParams(model="gpt-3.5-turbo")
    api_key: str | None
    base_url: str | None = None

    prompt_template = """
    Determine if a chart should be generated for this query.

    If a chart should be generated, determine the type of chart that should be generated and come up
    with a query specifying technical requirements.
    If a chart should not be generated, set should_generate_chart to False.
    """


class GeneratedChart(BaseModel):
    chartjs_json: str


@tags(["version:0001"])
class GenerateChartCall(OpenAIExtractor[GeneratedChart]):
    extract_schema: Type[GeneratedChart] = GeneratedChart
    call_params = OpenAICallParams(model="gpt-3.5-turbo")
    api_key: str | None
    base_url: str | None = None

    prompt_template = """
    Create a chartjs.org chart of type {chart_type} that would be appropriate for this data.
    Create a valid ChartJS config for this chart. Only return the valid JSON config.
    Don't use more than 5 colours.
    Make sure to avoid this error: Give the chart a relevant title, based on this request: {request}.

    For the input data, just fill in dummy data that matches the described data you're given and it's format.
    You can input dummy data like the examples you are given. The user will then replace these with the real data from the SQL results.

    Here is an example ChartJS config:
    {chartjs_template}
    """

    chartjs_template: str
    chart_type: str
    request: str

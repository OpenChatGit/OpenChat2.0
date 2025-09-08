from __future__ import annotations

from typing import Tuple

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory

from ..models.llm import get_llm
from ..memory.store import get_session_history


def build_history_chain(model_name: str = "llama3.1") -> Tuple[RunnableWithMessageHistory, object]:
    """Construct a LangChain LCEL chat chain with conversation history.

    Returns (history_chain, llm). history_chain yields strings (already parsed)
    when used with .invoke/.astream because we attach a StrOutputParser.
    """
    llm = get_llm(model=model_name, streaming=True)

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are OpenChat Assistant. Be helpful and concise."),
        MessagesPlaceholder("history"),
        ("human", "{input}")
    ])

    chain = prompt | llm | StrOutputParser()

    history_chain = RunnableWithMessageHistory(
        chain,
        get_session_history,
        input_messages_key="input",
        history_messages_key="history",
    )
    return history_chain, llm
